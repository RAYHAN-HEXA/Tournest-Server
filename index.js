/**
 * TourNest Server - Complete Consolidated Entry Point
 * Local Travel Guide Booking Platform Backend API
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import bcrypt from 'bcrypt';

// ===============================
// CONFIGURATION
// ===============================

let db = null;
let client = null;
let firebaseApp = null;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ===============================
// DATABASE FUNCTIONS
// ===============================

/**
 * Connect to MongoDB database
 */
async function connectToDatabase() {
  if (db && client) {
    return db;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  if (!dbName) {
    throw new Error('DB_NAME environment variable is not defined');
  }

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    console.log('✅ Connected to MongoDB successfully');

    db = client.db(dbName);

    // Create indexes on startup
    await createIndexes(db);

    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
}

/**
 * Create database indexes for better query performance
 */
async function createIndexes(database) {
  try {
    // Users collection indexes
    const users = database.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ firebaseUid: 1 }, { unique: true });
    await users.createIndex({ role: 1 });
    await users.createIndex({ createdAt: -1 });

    // Packages collection indexes
    const packages = database.collection('packages');
    await packages.createIndex({ ownerId: 1 });
    await packages.createIndex({ category: 1 });
    await packages.createIndex({ status: 1 });
    await packages.createIndex({ destination: 1 });
    await packages.createIndex({ createdAt: -1 });
    await packages.createIndex({ price: 1 });
    await packages.createIndex({ status: 1, category: 1, createdAt: -1 });

    // Bookings collection indexes
    const bookings = database.collection('bookings');
    await bookings.createIndex({ travelerId: 1 });
    await bookings.createIndex({ packageId: 1 });
    await bookings.createIndex({ packageOwnerId: 1 });
    await bookings.createIndex({ bookingStatus: 1 });
    await bookings.createIndex({ bookingDate: -1 });
    await bookings.createIndex({ travelDate: 1 });
    await bookings.createIndex({ travelerId: 1, bookingDate: -1 });
    await bookings.createIndex({ packageId: 1, bookingStatus: 1 });

    // Payments collection indexes
    const payments = database.collection('payments');
    await payments.createIndex({ travelerId: 1 });
    await payments.createIndex({ bookingId: 1 }, { unique: true });
    await payments.createIndex({ packageId: 1 });
    await payments.createIndex({ paymentDate: -1 });

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    if (error.code !== 85) {
      console.warn('⚠️ Warning creating indexes:', error.message);
    }
  }
}

/**
 * Get database instance (must be connected first)
 */
function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db;
}

/**
 * Check database connection status
 */
async function isHealthy() {
  if (!client || !db) {
    return false;
  }
  try {
    await db.admin().ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close MongoDB connection
 */
async function closeDatabase() {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log('MongoDB connection closed');
  }
}

// ===============================
// FIREBASE FUNCTIONS
// ===============================

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('⚠️ Firebase credentials not configured. Firebase token verification will not work.');
    console.warn('Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    return null;
  }

  try {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    const credentials = {
      projectId,
      clientEmail,
      privateKey: formattedPrivateKey,
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });

    console.log('✅ Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    return null;
  }
}

/**
 * Verify Firebase ID token
 */
async function verifyFirebaseToken(token) {
  if (!firebaseApp) {
    console.warn('Firebase Admin not initialized');
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Firebase token verification error:', error.message);
    return null;
  }
}

// ===============================
// UTILITY FUNCTIONS
// ===============================

/**
 * Generate JWT token for authenticated user
 */
function generateToken(user) {
  const payload = {
    userId: user.userId || user._id?.toString(),
    email: user.email,
    role: user.role || 'user',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.warn('JWT token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.warn('Invalid JWT token');
    }
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Validate MongoDB ObjectId
 */
function isValidObjectId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return ObjectId.isValid(id);
}

/**
 * Convert string to ObjectId
 */
function toObjectId(id) {
  if (!isValidObjectId(id)) {
    return null;
  }
  return new ObjectId(id);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize pagination parameters
 */
function sanitizePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 12));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Validate booking status
 */
function isValidBookingStatus(status) {
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'];
  return validStatuses.includes(status);
}

/**
 * Validate package status
 */
function isValidPackageStatus(status) {
  return status === 'Available' || status === 'Unavailable';
}

/**
 * Validate package category
 */
function isValidPackageCategory(category) {
  const validCategories = [
    'City Tour',
    'Adventure Trip',
    'Cultural Experience',
    'Food & Heritage Tour',
  ];
  return validCategories.includes(category);
}

/**
 * Validate role
 */
function isValidRole(role) {
  const validRoles = ['user', 'guide', 'admin'];
  return validRoles.includes(role);
}

/**
 * Sanitize sort parameter
 */
function sanitizeSort(sort, allowedFields = ['createdAt', 'price', 'title', 'destination']) {
  if (!sort || typeof sort !== 'string') {
    return { createdAt: -1 };
  }

  const field = sort.startsWith('-') ? sort.substring(1) : sort;
  const direction = sort.startsWith('-') ? -1 : 1;

  if (!allowedFields.includes(field)) {
    return { createdAt: -1 };
  }

  return { [field]: direction };
}

/**
 * Build filter object from query parameters
 */
function buildPackageFilters(query) {
  const filters = {};

  if (query.search) {
    const searchRegex = new RegExp(query.search, 'i');
    filters.$or = [
      { title: searchRegex },
      { destination: searchRegex },
      { description: searchRegex },
      { category: searchRegex },
      { guideName: searchRegex },
    ];
  }

  if (query.category && isValidPackageCategory(query.category)) {
    filters.category = query.category;
  }

  if (query.status && isValidPackageStatus(query.status)) {
    filters.status = query.status;
  }

  if (query.destination) {
    filters.destination = new RegExp(query.destination, 'i');
  }

  if (query.minPrice || query.maxPrice) {
    filters.price = {};
    if (query.minPrice) {
      const minPrice = parseFloat(query.minPrice);
      if (!isNaN(minPrice) && minPrice >= 0) {
        filters.price.$gte = minPrice;
      }
    }
    if (query.maxPrice) {
      const maxPrice = parseFloat(query.maxPrice);
      if (!isNaN(maxPrice) && maxPrice >= 0) {
        filters.price.$lte = maxPrice;
      }
    }
  }

  filters.isDeleted = { $ne: true };

  return filters;
}

/**
 * Send success response
 */
function sendSuccess(res, message = 'Success', data = null, meta = null, statusCode = 200) {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send error response
 */
function sendError(res, message = 'An error occurred', error = null, statusCode = 500) {
  const response = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send validation error response
 */
function sendValidationError(res, message = 'Validation failed', errors = []) {
  return res.status(422).json({
    success: false,
    message,
    errors,
  });
}

/**
 * Async Error Wrapper
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ===============================
// MIDDLEWARE
// ===============================

/**
 * Authentication middleware
 */
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required',
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
      });
    }

    const database = getDb();
    const user = await database.collection('users').findOne(
      { _id: decoded.userId },
      { projection: { _id: 1, name: 1, email: 1, photoURL: 1, role: 1 } }
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      photoURL: user.photoURL,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
}

/**
 * Optional authentication middleware
 */
async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const database = getDb();
        const user = await database.collection('users').findOne(
          { _id: decoded.userId },
          { projection: { _id: 1, name: 1, email: 1, photoURL: 1, role: 1 } }
        );

        if (user) {
          req.user = {
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
            photoURL: user.photoURL,
            role: user.role,
          };
        }
      }
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * Validate package input
 */
function validatePackage(req, res, next) {
  const { title, category, destination, description, itinerary, image, price, duration, maxTravelers, status } = req.body;

  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    errors.push({ field: 'title', message: 'Title is required and must be at least 3 characters' });
  }

  if (!category || !isValidPackageCategory(category)) {
    errors.push({
      field: 'category',
      message: `Category is required and must be one of: City Tour, Adventure Trip, Cultural Experience, Food & Heritage Tour`,
    });
  }

  if (!destination || typeof destination !== 'string' || destination.trim().length < 2) {
    errors.push({ field: 'destination', message: 'Destination is required and must be at least 2 characters' });
  }

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    errors.push({ field: 'description', message: 'Description is required and must be at least 10 characters' });
  }

  if (!itinerary || typeof itinerary !== 'string' || itinerary.trim().length < 10) {
    errors.push({ field: 'itinerary', message: 'Itinerary is required and must be at least 10 characters' });
  }

  if (!image || typeof image !== 'string' || !isValidURL(image)) {
    errors.push({ field: 'image', message: 'Image URL is required and must be a valid URL' });
  }

  const priceNum = parseFloat(price);
  if (isNaN(priceNum) || priceNum < 0) {
    errors.push({ field: 'price', message: 'Price is required and must be a non-negative number' });
  }

  if (!duration || typeof duration !== 'string' || duration.trim().length < 1) {
    errors.push({ field: 'duration', message: 'Duration is required' });
  }

  const maxTravelersNum = parseInt(maxTravelers);
  if (isNaN(maxTravelersNum) || maxTravelersNum < 1) {
    errors.push({ field: 'maxTravelers', message: 'Max travelers is required and must be at least 1' });
  }

  if (status && !isValidPackageStatus(status)) {
    errors.push({ field: 'status', message: 'Status must be either Available or Unavailable' });
  }

  if (errors.length > 0) {
    return sendValidationError(res, 'Package validation failed', errors);
  }

  next();
}

/**
 * Validate booking input
 */
function validateBooking(req, res, next) {
  const { packageId, phone, address, travelDate, numberOfTravelers, additionalMessage } = req.body;

  const errors = [];

  if (!packageId || !isValidObjectId(packageId)) {
    errors.push({ field: 'packageId', message: 'Valid package ID is required' });
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length < 10) {
    errors.push({ field: 'phone', message: 'Phone number is required and must be at least 10 characters' });
  }

  if (!address || typeof address !== 'string' || address.trim().length < 5) {
    errors.push({ field: 'address', message: 'Address is required and must be at least 5 characters' });
  }

  if (!travelDate) {
    errors.push({ field: 'travelDate', message: 'Travel date is required' });
  } else {
    const date = new Date(travelDate);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'travelDate', message: 'Travel date must be a valid date' });
    } else if (date < new Date().setHours(0, 0, 0, 0)) {
      errors.push({ field: 'travelDate', message: 'Travel date cannot be in the past' });
    }
  }

  const travelersNum = parseInt(numberOfTravelers);
  if (isNaN(travelersNum) || travelersNum < 1) {
    errors.push({ field: 'numberOfTravelers', message: 'Number of travelers is required and must be at least 1' });
  }

  if (additionalMessage !== undefined && typeof additionalMessage !== 'string') {
    errors.push({ field: 'additionalMessage', message: 'Additional message must be a string' });
  }

  if (errors.length > 0) {
    return sendValidationError(res, 'Booking validation failed', errors);
  }

  next();
}

/**
 * Validate ObjectId parameter
 */
function validateObjectId(param = 'id') {
  return (req, res, next) => {
    const id = req.params[param];

    if (!isValidObjectId(id)) {
      return sendError(res, `Invalid ${param} format`, null, 400);
    }

    next();
  };
}

/**
 * Validate booking status update
 */
function validateBookingStatus(req, res, next) {
  const { status } = req.body;

  if (!status || !isValidBookingStatus(status)) {
    return sendError(res, 'Valid booking status is required (pending, confirmed, cancelled, completed, rejected)', null, 400);
  }

  next();
}

/**
 * Validate user profile update
 */
function validateUserUpdate(req, res, next) {
  const { name, photoURL } = req.body;

  const errors = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
    }
  }

  if (photoURL !== undefined) {
    if (photoURL !== null && photoURL !== '' && !isValidURL(photoURL)) {
      errors.push({ field: 'photoURL', message: 'Photo URL must be a valid URL' });
    }
  }

  const protectedFields = ['email', 'role', 'firebaseUid'];
  for (const field of protectedFields) {
    if (req.body[field] !== undefined) {
      errors.push({ field, message: `Cannot modify ${field} through this endpoint` });
    }
  }

  if (errors.length > 0) {
    return sendValidationError(res, 'User update validation failed', errors);
  }

  next();
}

/**
 * Validate login request
 */
function validateLogin(req, res, next) {
  const { firebaseToken } = req.body;

  if (!firebaseToken || typeof firebaseToken !== 'string' || firebaseToken.trim().length < 10) {
    return sendError(res, 'Valid Firebase token is required', null, 400);
  }

  next();
}

/**
 * Validate registration request
 */
function validateRegistration(req, res, next) {
  const { name, email, password, role } = req.body;

  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name is required and must be at least 2 characters' });
  }

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Valid email is required' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push({ field: 'password', message: 'Password is required and must be at least 6 characters' });
  }

  if (role !== undefined && !['user', 'guide'].includes(role)) {
    errors.push({ field: 'role', message: 'Role must be either "user" or "guide"' });
  }

  if (errors.length > 0) {
    return sendValidationError(res, 'Registration validation failed', errors);
  }

  next();
}

/**
 * Validate email/password login request
 */
function validateEmailLogin(req, res, next) {
  const { email, password } = req.body;

  const errors = [];

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Valid email is required' });
  }

  if (!password || typeof password !== 'string' || password.length < 1) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  if (errors.length > 0) {
    return sendValidationError(res, 'Login validation failed', errors);
  }

  next();
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      message: 'Validation error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token expired',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack }),
  });
}

/**
 * 404 handler
 */
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
}

// ===============================
// CONTROLLERS
// ===============================

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, password, role = 'user' } = req.body;

    const database = getDb();

    // Check if user already exists
    const existingUser = await database.collection('users').findOne({
      $or: [{ email: email.toLowerCase() }, { email: email }]
    });

    if (existingUser) {
      return sendError(res, 'User with this email already exists', null, 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      _id: new ObjectId(),
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await database.collection('users').insertOne(newUser);

    // Generate token
    const token = generateToken({
      userId: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
    });

    return sendSuccess(res, 'Registration successful', {
      token,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return sendError(res, 'Registration failed', process.env.NODE_ENV === 'development' ? error.message : null);
  }
}

/**
 * POST /api/auth/login-email
 */
async function loginEmail(req, res) {
  try {
    const { email, password } = req.body;

    const database = getDb();

    // Find user by email
    const user = await database.collection('users').findOne({
      $or: [{ email: email.toLowerCase() }, { email: email }]
    });

    if (!user) {
      return sendError(res, 'Invalid email or password', null, 401);
    }

    // Check if user has password (not Firebase user)
    if (!user.password) {
      return sendError(res, 'Please use Firebase authentication for this account', null, 400);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return sendError(res, 'Invalid email or password', null, 401);
    }

    // Update last login
    await database.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return sendSuccess(res, 'Login successful', {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Email login error:', error);
    return sendError(res, 'Login failed', process.env.NODE_ENV === 'development' ? error.message : null);
  }
}

/**
 * POST /api/auth/login (Firebase)
 */
async function login(req, res) {
  try {
    const { firebaseToken } = req.body;

    const decodedFirebase = await verifyFirebaseToken(firebaseToken);
    if (!decodedFirebase) {
      return sendError(res, 'Invalid Firebase token', null, 401);
    }

    const database = getDb();
    let user;

    user = await database.collection('users').findOne({ firebaseUid: decodedFirebase.uid });

    if (!user) {
      const newUser = {
        _id: new ObjectId(),
        name: decodedFirebase.name || 'User',
        email: decodedFirebase.email,
        photoURL: decodedFirebase.picture || '',
        firebaseUid: decodedFirebase.uid,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      await database.collection('users').insertOne(newUser);
      user = newUser;
    } else {
      await database.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            lastLoginAt: new Date(),
            updatedAt: new Date(),
            ...(decodedFirebase.name && { name: decodedFirebase.name }),
            ...(decodedFirebase.picture && { photoURL: decodedFirebase.picture }),
          },
        }
      );
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return sendSuccess(res, 'Authentication successful', {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 'Authentication failed', process.env.NODE_ENV === 'development' ? error.message : null);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  return sendSuccess(res, 'Logout successful. Please clear your token on the client side.');
}

/**
 * GET /api/auth/me
 */
async function getCurrentUser(req, res) {
  try {
    const user = req.user;

    if (!user) {
      return sendError(res, 'User not authenticated', null, 401);
    }

    const database = getDb();
    const fullUser = await database.collection('users').findOne(
      { _id: user.userId },
      { projection: { _id: 1, name: 1, email: 1, photoURL: 1, role: 1, createdAt: 1, lastLoginAt: 1 } }
    );

    if (!fullUser) {
      return sendError(res, 'User not found', null, 404);
    }

    return sendSuccess(res, 'User retrieved successfully', {
      id: fullUser._id.toString(),
      name: fullUser.name,
      email: fullUser.email,
      photoURL: fullUser.photoURL,
      role: fullUser.role,
      createdAt: fullUser.createdAt,
      lastLoginAt: fullUser.lastLoginAt,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return sendError(res, 'Failed to retrieve user');
  }
}

/**
 * POST /api/auth/refresh
 */
async function refreshToken(req, res) {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required', null, 401);
    }

    const newToken = generateToken({
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    });

    return sendSuccess(res, 'Token refreshed successfully', { token: newToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    return sendError(res, 'Failed to refresh token');
  }
}

/**
 * GET /api/users/me
 */
async function getProfile(req, res) {
  try {
    const database = getDb();
    const user = await database.collection('users').findOne(
      { _id: req.user.userId },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          photoURL: 1,
          role: 1,
          createdAt: 1,
          lastLoginAt: 1,
        },
      }
    );

    if (!user) {
      return sendError(res, 'User not found', null, 404);
    }

    return sendSuccess(res, 'Profile retrieved successfully', {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      photoURL: user.photoURL,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return sendError(res, 'Failed to retrieve profile');
  }
}

/**
 * PATCH /api/users/me
 */
async function updateProfile(req, res) {
  try {
    const { name, photoURL } = req.body;
    const database = getDb();

    const updateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (photoURL !== undefined) {
      updateData.photoURL = photoURL || '';
    }

    const result = await database.collection('users').updateOne(
      { _id: req.user.userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return sendError(res, 'User not found', null, 404);
    }

    const updatedUser = await database.collection('users').findOne(
      { _id: req.user.userId },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          photoURL: 1,
          role: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    return sendSuccess(res, 'Profile updated successfully', {
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      photoURL: updatedUser.photoURL,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return sendError(res, 'Failed to update profile');
  }
}

/**
 * GET /api/packages
 */
async function getPackages(req, res) {
  try {
    const database = getDb();
    const { page, limit, skip } = sanitizePagination(req.query);
    const filters = buildPackageFilters(req.query);
    const sort = sanitizeSort(req.query.sort, ['createdAt', 'price', 'title', 'destination', 'duration']);

    const total = await database.collection('packages').countDocuments(filters);

    const packages = await database
      .collection('packages')
      .find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    const transformedPackages = packages.map((pkg) => ({
      id: pkg._id.toString(),
      title: pkg.title,
      category: pkg.category,
      destination: pkg.destination,
      description: pkg.description,
      itinerary: pkg.itinerary,
      image: pkg.image,
      price: pkg.price,
      duration: pkg.duration,
      maxTravelers: pkg.maxTravelers,
      status: pkg.status,
      guideName: pkg.guideName,
      createdAt: pkg.createdAt,
    }));

    return sendSuccess(
      res,
      'Packages fetched successfully',
      transformedPackages,
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    console.error('Get packages error:', error);
    return sendError(res, 'Failed to fetch packages');
  }
}

/**
 * GET /api/packages/featured
 */
async function getFeaturedPackages(req, res) {
  try {
    const database = getDb();

    const packages = await database
      .collection('packages')
      .find({ isDeleted: { $ne: true }, status: 'Available' })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    const transformedPackages = packages.map((pkg) => ({
      id: pkg._id.toString(),
      title: pkg.title,
      category: pkg.category,
      destination: pkg.destination,
      description: pkg.description,
      image: pkg.image,
      price: pkg.price,
      duration: pkg.duration,
      maxTravelers: pkg.maxTravelers,
      status: pkg.status,
      guideName: pkg.guideName,
      createdAt: pkg.createdAt,
    }));

    return sendSuccess(res, 'Featured packages fetched successfully', transformedPackages);
  } catch (error) {
    console.error('Get featured packages error:', error);
    return sendError(res, 'Failed to fetch featured packages');
  }
}

/**
 * GET /api/packages/my
 */
async function getMyPackages(req, res) {
  try {
    const database = getDb();
    const { page, limit, skip } = sanitizePagination(req.query);

    const filters = {
      ownerId: req.user.userId,
      isDeleted: { $ne: true },
    };

    const total = await database.collection('packages').countDocuments(filters);

    const packages = await database
      .collection('packages')
      .find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const transformedPackages = packages.map((pkg) => ({
      id: pkg._id.toString(),
      title: pkg.title,
      category: pkg.category,
      destination: pkg.destination,
      description: pkg.description,
      itinerary: pkg.itinerary,
      image: pkg.image,
      price: pkg.price,
      duration: pkg.duration,
      maxTravelers: pkg.maxTravelers,
      status: pkg.status,
      guideName: pkg.guideName,
      guideEmail: pkg.guideEmail,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    }));

    return sendSuccess(
      res,
      'Your packages fetched successfully',
      transformedPackages,
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    console.error('Get my packages error:', error);
    return sendError(res, 'Failed to fetch your packages');
  }
}

/**
 * GET /api/packages/:id
 */
async function getPackageById(req, res) {
  try {
    const { id } = req.params;
    const database = getDb();

    const pkg = await database.collection('packages').findOne({
      _id: new ObjectId(id),
      isDeleted: { $ne: true },
    });

    if (!pkg) {
      return sendError(res, 'Package not found', null, 404);
    }

    const transformedPackage = {
      id: pkg._id.toString(),
      title: pkg.title,
      category: pkg.category,
      destination: pkg.destination,
      description: pkg.description,
      itinerary: pkg.itinerary,
      image: pkg.image,
      price: pkg.price,
      duration: pkg.duration,
      maxTravelers: pkg.maxTravelers,
      status: pkg.status,
      guideName: pkg.guideName,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    };

    if (req.user && (req.user.userId === pkg.ownerId.toString() || req.user.role === 'admin')) {
      transformedPackage.guideEmail = pkg.guideEmail;
    }

    return sendSuccess(res, 'Package fetched successfully', transformedPackage);
  } catch (error) {
    console.error('Get package error:', error);
    return sendError(res, 'Failed to fetch package');
  }
}

/**
 * POST /api/packages
 */
async function createPackage(req, res) {
  try {
    const { title, category, destination, description, itinerary, image, price, duration, maxTravelers, status } =
      req.body;

    const database = getDb();

    const newPackage = {
      _id: new ObjectId(),
      title: title.trim(),
      category,
      destination: destination.trim(),
      description: description.trim(),
      itinerary: itinerary.trim(),
      image: image.trim(),
      price: parseFloat(price),
      duration: duration.trim(),
      maxTravelers: parseInt(maxTravelers),
      status: status || 'Available',
      guideName: req.user.name,
      guideEmail: req.user.email,
      ownerId: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };

    await database.collection('packages').insertOne(newPackage);

    const transformedPackage = {
      id: newPackage._id.toString(),
      title: newPackage.title,
      category: newPackage.category,
      destination: newPackage.destination,
      description: newPackage.description,
      itinerary: newPackage.itinerary,
      image: newPackage.image,
      price: newPackage.price,
      duration: newPackage.duration,
      maxTravelers: newPackage.maxTravelers,
      status: newPackage.status,
      guideName: newPackage.guideName,
      guideEmail: newPackage.guideEmail,
      createdAt: newPackage.createdAt,
    };

    return sendSuccess(res, 'Package created successfully', transformedPackage, null, 201);
  } catch (error) {
    console.error('Create package error:', error);
    return sendError(res, 'Failed to create package');
  }
}

/**
 * PATCH /api/packages/:id
 */
async function updatePackage(req, res) {
  try {
    const { id } = req.params;
    const { title, category, destination, description, itinerary, image, price, duration, maxTravelers, status } =
      req.body;

    const database = getDb();

    const existingPackage = await database.collection('packages').findOne({
      _id: new ObjectId(id),
      isDeleted: { $ne: true },
    });

    if (!existingPackage) {
      return sendError(res, 'Package not found', null, 404);
    }

    if (existingPackage.ownerId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return sendError(res, 'You are not authorized to update this package', null, 403);
    }

    const updateData = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (category !== undefined) updateData.category = category;
    if (destination !== undefined) updateData.destination = destination.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (itinerary !== undefined) updateData.itinerary = itinerary.trim();
    if (image !== undefined) updateData.image = image.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (duration !== undefined) updateData.duration = duration.trim();
    if (maxTravelers !== undefined) updateData.maxTravelers = parseInt(maxTravelers);
    if (status !== undefined) updateData.status = status;

    await database.collection('packages').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    const updatedPackage = await database.collection('packages').findOne({ _id: new ObjectId(id) });

    const transformedPackage = {
      id: updatedPackage._id.toString(),
      title: updatedPackage.title,
      category: updatedPackage.category,
      destination: updatedPackage.destination,
      description: updatedPackage.description,
      itinerary: updatedPackage.itinerary,
      image: updatedPackage.image,
      price: updatedPackage.price,
      duration: updatedPackage.duration,
      maxTravelers: updatedPackage.maxTravelers,
      status: updatedPackage.status,
      guideName: updatedPackage.guideName,
      guideEmail: updatedPackage.guideEmail,
      createdAt: updatedPackage.createdAt,
      updatedAt: updatedPackage.updatedAt,
    };

    return sendSuccess(res, 'Package updated successfully', transformedPackage);
  } catch (error) {
    console.error('Update package error:', error);
    return sendError(res, 'Failed to update package');
  }
}

/**
 * DELETE /api/packages/:id
 */
async function deletePackage(req, res) {
  try {
    const { id } = req.params;
    const database = getDb();

    const existingPackage = await database.collection('packages').findOne({
      _id: new ObjectId(id),
    });

    if (!existingPackage) {
      return sendError(res, 'Package not found', null, 404);
    }

    if (existingPackage.ownerId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return sendError(res, 'You are not authorized to delete this package', null, 403);
    }

    const bookingCount = await database.collection('bookings').countDocuments({
      packageId: new ObjectId(id),
      bookingStatus: { $in: ['pending', 'confirmed', 'completed'] },
    });

    if (bookingCount > 0) {
      await database.collection('packages').updateOne({ _id: new ObjectId(id) }, { $set: { isDeleted: true, updatedAt: new Date() } });
      return sendSuccess(res, 'Package soft deleted successfully (booking history preserved)');
    }

    await database.collection('packages').deleteOne({ _id: new ObjectId(id) });

    return sendSuccess(res, 'Package deleted successfully');
  } catch (error) {
    console.error('Delete package error:', error);
    return sendError(res, 'Failed to delete package');
  }
}

/**
 * GET /api/packages/:packageId/bookings
 */
async function getPackageBookings(req, res) {
  try {
    const { packageId } = req.params;
    const database = getDb();

    const pkg = await database.collection('packages').findOne({ _id: new ObjectId(packageId) });

    if (!pkg) {
      return sendError(res, 'Package not found', null, 404);
    }

    const isOwner = pkg.ownerId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendError(res, 'You are not authorized to view these bookings', null, 403);
    }

    const bookings = await database
      .collection('bookings')
      .find({ packageId: new ObjectId(packageId) })
      .sort({ bookingDate: -1 })
      .toArray();

    const transformedBookings = bookings.map((booking) => {
      const baseBooking = {
        id: booking._id.toString(),
        packageTitle: booking.packageTitle,
        category: booking.category,
        destination: booking.destination,
        numberOfTravelers: booking.numberOfTravelers,
        totalAmount: booking.totalAmount,
        bookingStatus: booking.bookingStatus,
        travelDate: booking.travelDate,
        bookingDate: booking.bookingDate,
      };

      if (isOwner || isAdmin) {
        baseBooking.travelerName = booking.travelerName;
        baseBooking.travelerEmail = booking.travelerEmail;
        baseBooking.travelerImage = booking.travelerImage;
        baseBooking.phone = booking.phone;
        baseBooking.address = booking.address;
        baseBooking.additionalMessage = booking.additionalMessage;
      }

      return baseBooking;
    });

    return sendSuccess(res, 'Package bookings fetched successfully', transformedBookings);
  } catch (error) {
    console.error('Get package bookings error:', error);
    return sendError(res, 'Failed to fetch package bookings');
  }
}

/**
 * GET /api/packages/:packageId/booking-summary
 */
async function getPackageBookingSummary(req, res) {
  try {
    const { packageId } = req.params;
    const database = getDb();

    const pkg = await database.collection('packages').findOne({
      _id: new ObjectId(packageId),
      isDeleted: { $ne: true },
    });

    if (!pkg) {
      return sendError(res, 'Package not found', null, 404);
    }

    const isOwner = pkg.ownerId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendError(res, 'You are not authorized to view this summary', null, 403);
    }

    const bookingAggregation = await database
      .collection('bookings')
      .aggregate([
        {
          $match: {
            packageId: new ObjectId(packageId),
            bookingStatus: { $in: ['pending', 'confirmed'] },
          },
        },
        {
          $group: {
            _id: null,
            bookedTravelers: { $sum: '$numberOfTravelers' },
            bookingCount: { $sum: 1 },
            totalCollected: {
              $sum: {
                $cond: [{ $eq: ['$bookingStatus', 'confirmed'] }, '$totalAmount', 0],
              },
            },
          },
        },
      ])
      .toArray();

    const summary = bookingAggregation[0] || { bookedTravelers: 0, bookingCount: 0, totalCollected: 0 };

    return sendSuccess(res, 'Booking summary fetched successfully', {
      maxTravelers: pkg.maxTravelers,
      bookedTravelers: summary.bookedTravelers,
      remainingTravelers: Math.max(0, pkg.maxTravelers - summary.bookedTravelers),
      bookingCount: summary.bookingCount,
      totalCollected: summary.totalCollected,
    });
  } catch (error) {
    console.error('Get booking summary error:', error);
    return sendError(res, 'Failed to fetch booking summary');
  }
}

/**
 * POST /api/bookings
 */
async function createBooking(req, res) {
  try {
    const { packageId, phone, address, travelDate, numberOfTravelers, additionalMessage } = req.body;

    const database = getDb();

    const pkg = await database.collection('packages').findOne({
      _id: new ObjectId(packageId),
      isDeleted: { $ne: true },
    });

    if (!pkg) {
      return sendError(res, 'Package not found', null, 404);
    }

    if (pkg.status !== 'Available') {
      return sendError(res, 'This package is currently unavailable for booking', null, 400);
    }

    const travelersNum = parseInt(numberOfTravelers);
    if (travelersNum > pkg.maxTravelers) {
      return sendError(
        res,
        `This package allows a maximum of ${pkg.maxTravelers} travelers per booking`,
        null,
        400
      );
    }

    const capacityCheck = await database
      .collection('bookings')
      .aggregate([
        {
          $match: {
            packageId: new ObjectId(packageId),
            bookingStatus: { $in: ['pending', 'confirmed'] },
          },
        },
        {
          $group: {
            _id: null,
            totalTravelers: { $sum: '$numberOfTravelers' },
          },
        },
      ])
      .toArray();

    const existingTravelers = capacityCheck[0]?.totalTravelers || 0;
    const availableCapacity = pkg.maxTravelers - existingTravelers;

    if (travelersNum > availableCapacity) {
      return sendError(
        res,
        `Not enough traveler capacity available. Only ${availableCapacity} spots remaining for this package.`,
        null,
        409
      );
    }

    const existingBooking = await database.collection('bookings').findOne({
      packageId: new ObjectId(packageId),
      travelerId: req.user.userId,
      travelDate: new Date(travelDate),
      bookingStatus: { $in: ['pending', 'confirmed'] },
    });

    if (existingBooking) {
      return sendError(res, 'You already have an active booking for this package on this date', null, 409);
    }

    const totalAmount = pkg.price * travelersNum;

    const newBooking = {
      _id: new ObjectId(),
      packageId: new ObjectId(packageId),
      packageOwnerId: pkg.ownerId,
      packageTitle: pkg.title,
      category: pkg.category,
      destination: pkg.destination,
      price: pkg.price,
      travelerId: req.user.userId,
      travelerName: req.user.name,
      travelerEmail: req.user.email,
      travelerImage: req.user.photoURL || '',
      phone: phone.trim(),
      address: address.trim(),
      travelDate: new Date(travelDate),
      numberOfTravelers: travelersNum,
      totalAmount,
      bookingStatus: 'pending',
      bookingDate: new Date(),
      additionalMessage: additionalMessage?.trim() || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await database.collection('bookings').insertOne(newBooking);

    const transformedBooking = {
      id: newBooking._id.toString(),
      packageId: newBooking.packageId.toString(),
      packageTitle: newBooking.packageTitle,
      category: newBooking.category,
      destination: newBooking.destination,
      price: newBooking.price,
      numberOfTravelers: newBooking.numberOfTravelers,
      totalAmount: newBooking.totalAmount,
      bookingStatus: newBooking.bookingStatus,
      travelDate: newBooking.travelDate,
      bookingDate: newBooking.bookingDate,
      additionalMessage: newBooking.additionalMessage,
    };

    return sendSuccess(res, 'Booking created successfully', transformedBooking, null, 201);
  } catch (error) {
    console.error('Create booking error:', error);
    return sendError(res, 'Failed to create booking');
  }
}

/**
 * GET /api/bookings/my
 */
async function getMyBookings(req, res) {
  try {
    const database = getDb();
    const { page, limit, skip } = sanitizePagination(req.query);
    const { status } = req.query;

    const filters = {
      travelerId: req.user.userId,
    };

    if (status) {
      filters.bookingStatus = status;
    }

    const total = await database.collection('bookings').countDocuments(filters);

    const bookings = await database
      .collection('bookings')
      .find(filters)
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const transformedBookings = bookings.map((booking) => ({
      id: booking._id.toString(),
      packageId: booking.packageId.toString(),
      packageTitle: booking.packageTitle,
      category: booking.category,
      destination: booking.destination,
      price: booking.price,
      numberOfTravelers: booking.numberOfTravelers,
      totalAmount: booking.totalAmount,
      bookingStatus: booking.bookingStatus,
      travelDate: booking.travelDate,
      bookingDate: booking.bookingDate,
      additionalMessage: booking.additionalMessage,
    }));

    return sendSuccess(
      res,
      'Your bookings fetched successfully',
      transformedBookings,
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    console.error('Get my bookings error:', error);
    return sendError(res, 'Failed to fetch your bookings');
  }
}

/**
 * GET /api/bookings/:id
 */
async function getBookingById(req, res) {
  try {
    const { id } = req.params;
    const database = getDb();

    const booking = await database.collection('bookings').findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return sendError(res, 'Booking not found', null, 404);
    }

    const isTraveler = booking.travelerId.toString() === req.user.userId;
    const isPackageOwner = booking.packageOwnerId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isTraveler && !isPackageOwner && !isAdmin) {
      return sendError(res, 'You are not authorized to view this booking', null, 403);
    }

    const transformedBooking = {
      id: booking._id.toString(),
      packageId: booking.packageId.toString(),
      packageTitle: booking.packageTitle,
      category: booking.category,
      destination: booking.destination,
      price: booking.price,
      numberOfTravelers: booking.numberOfTravelers,
      totalAmount: booking.totalAmount,
      bookingStatus: booking.bookingStatus,
      travelDate: booking.travelDate,
      bookingDate: booking.bookingDate,
      additionalMessage: booking.additionalMessage,
      createdAt: booking.createdAt,
    };

    if (isPackageOwner || isAdmin) {
      transformedBooking.travelerName = booking.travelerName;
      transformedBooking.travelerEmail = booking.travelerEmail;
      transformedBooking.travelerImage = booking.travelerImage;
      transformedBooking.phone = booking.phone;
      transformedBooking.address = booking.address;
    }

    if (isTraveler) {
      transformedBooking.phone = booking.phone;
      transformedBooking.address = booking.address;
    }

    return sendSuccess(res, 'Booking fetched successfully', transformedBooking);
  } catch (error) {
    console.error('Get booking error:', error);
    return sendError(res, 'Failed to fetch booking');
  }
}

/**
 * PATCH /api/bookings/:id/status
 */
async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const database = getDb();

    const booking = await database.collection('bookings').findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return sendError(res, 'Booking not found', null, 404);
    }

    const isPackageOwner = booking.packageOwnerId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isPackageOwner && !isAdmin) {
      return sendError(res, 'Only the package owner or admin can update booking status', null, 403);
    }

    await database.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          bookingStatus: status,
          updatedAt: new Date(),
        },
      }
    );

    if (status === 'confirmed' && booking.bookingStatus !== 'confirmed') {
      const existingPayment = await database.collection('payments').findOne({ bookingId: new ObjectId(id) });

      if (!existingPayment) {
        const payment = {
          _id: new ObjectId(),
          bookingId: new ObjectId(id),
          packageId: booking.packageId,
          travelerId: booking.travelerId,
          travelerEmail: booking.travelerEmail,
          packageTitle: booking.packageTitle,
          category: booking.category,
          destination: booking.destination,
          amount: booking.totalAmount,
          currency: 'BDT',
          paymentStatus: 'paid',
          transactionId: `TN-${Date.now()}`,
          paymentDate: new Date(),
          createdAt: new Date(),
        };

        await database.collection('payments').insertOne(payment);
      }
    }

    const updatedBooking = await database.collection('bookings').findOne({ _id: new ObjectId(id) });

    return sendSuccess(res, 'Booking status updated successfully', {
      id: updatedBooking._id.toString(),
      bookingStatus: updatedBooking.bookingStatus,
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    return sendError(res, 'Failed to update booking status');
  }
}

/**
 * PATCH /api/bookings/:id/cancel
 */
async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const database = getDb();

    const booking = await database.collection('bookings').findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return sendError(res, 'Booking not found', null, 404);
    }

    const isTraveler = booking.travelerId.toString() === req.user.userId;
    const isPackageOwner = booking.packageOwnerId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isTraveler && !isPackageOwner && !isAdmin) {
      return sendError(res, 'You are not authorized to cancel this booking', null, 403);
    }

    if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'completed') {
      return sendError(res, `Cannot cancel a ${booking.bookingStatus} booking`, null, 400);
    }

    await database.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          bookingStatus: 'cancelled',
          updatedAt: new Date(),
        },
      }
    );

    await database.collection('payments').updateMany(
      { bookingId: new ObjectId(id) },
      {
        $set: {
          paymentStatus: 'refunded',
        },
      }
    );

    return sendSuccess(res, 'Booking cancelled successfully');
  } catch (error) {
    console.error('Cancel booking error:', error);
    return sendError(res, 'Failed to cancel booking');
  }
}

/**
 * GET /api/bookings/:id/invoice
 */
async function getBookingInvoice(req, res) {
  try {
    const { id } = req.params;
    const database = getDb();

    const booking = await database.collection('bookings').findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return sendError(res, 'Booking not found', null, 404);
    }

    const isTraveler = booking.travelerId.toString() === req.user.userId;
    const isPackageOwner = booking.packageOwnerId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isTraveler && !isPackageOwner && !isAdmin) {
      return sendError(res, 'You are not authorized to view this invoice', null, 403);
    }

    const invoiceNumber = `TN-${new Date(booking.bookingDate).getFullYear()}-${String(booking._id.toString().slice(-6)).padStart(6, '0')}`;

    const invoiceData = {
      invoiceNumber,
      travelerName: booking.travelerName,
      travelerEmail: booking.travelerEmail,
      packageTitle: booking.packageTitle,
      category: booking.category,
      destination: booking.destination,
      travelDate: booking.travelDate,
      numberOfTravelers: booking.numberOfTravelers,
      pricePerTraveler: booking.price,
      totalAmount: booking.totalAmount,
      bookingStatus: booking.bookingStatus,
      bookingDate: booking.bookingDate,
      additionalMessage: booking.additionalMessage,
    };

    return sendSuccess(res, 'Invoice data retrieved successfully', invoiceData);
  } catch (error) {
    console.error('Get invoice error:', error);
    return sendError(res, 'Failed to retrieve invoice data');
  }
}

/**
 * GET /api/payments/my
 */
async function getMyPayments(req, res) {
  try {
    const database = getDb();
    const { page, limit, skip } = sanitizePagination(req.query);

    const filters = {
      travelerId: req.user.userId,
    };

    const total = await database.collection('payments').countDocuments(filters);

    const payments = await database
      .collection('payments')
      .find(filters)
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const transformedPayments = payments.map((payment) => ({
      id: payment._id.toString(),
      bookingId: payment.bookingId.toString(),
      packageId: payment.packageId.toString(),
      packageTitle: payment.packageTitle,
      category: payment.category,
      destination: payment.destination,
      amount: payment.amount,
      currency: payment.currency,
      paymentStatus: payment.paymentStatus,
      transactionId: payment.transactionId,
      paymentDate: payment.paymentDate,
    }));

    return sendSuccess(
      res,
      'Payment history fetched successfully',
      transformedPayments,
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    console.error('Get my payments error:', error);
    return sendError(res, 'Failed to fetch payment history');
  }
}

/**
 * GET /api/payments/:id
 */
async function getPaymentById(req, res) {
  try {
    const { id } = req.params;
    const database = getDb();

    const payment = await database.collection('payments').findOne({ _id: new ObjectId(id) });

    if (!payment) {
      return sendError(res, 'Payment not found', null, 404);
    }

    const isOwner = payment.travelerId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendError(res, 'You are not authorized to view this payment', null, 403);
    }

    const transformedPayment = {
      id: payment._id.toString(),
      bookingId: payment.bookingId.toString(),
      packageId: payment.packageId.toString(),
      packageTitle: payment.packageTitle,
      category: payment.category,
      destination: payment.destination,
      amount: payment.amount,
      currency: payment.currency,
      paymentStatus: payment.paymentStatus,
      transactionId: payment.transactionId,
      paymentDate: payment.paymentDate,
      createdAt: payment.createdAt,
    };

    if (isOwner || isAdmin) {
      transformedPayment.travelerEmail = payment.travelerEmail;
    }

    return sendSuccess(res, 'Payment fetched successfully', transformedPayment);
  } catch (error) {
    console.error('Get payment error:', error);
    return sendError(res, 'Failed to fetch payment');
  }
}

/**
 * GET /api/stats
 */
async function getPlatformStats(req, res) {
  try {
    const database = getDb();

    const [totalUsers, totalPackages, totalBookings, totalCompletedTrips] = await Promise.all([
      database.collection('users').countDocuments({}),
      database.collection('packages').countDocuments({ isDeleted: { $ne: true } }),
      database.collection('bookings').countDocuments({}),
      database.collection('bookings').countDocuments({ bookingStatus: 'completed' }),
    ]);

    return sendSuccess(res, 'Platform statistics retrieved successfully', {
      totalUsers,
      totalPackages,
      totalBookings,
      totalCompletedTrips,
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    return sendError(res, 'Failed to retrieve platform statistics');
  }
}

/**
 * GET /api/guides/me/stats
 */
async function getGuideStats(req, res) {
  try {
    const database = getDb();

    if (req.user.role !== 'guide' && req.user.role !== 'admin') {
      return sendError(res, 'Guide access required', null, 403);
    }

    const packages = await database
      .collection('packages')
      .find({
        ownerId: req.user.userId,
        isDeleted: { $ne: true },
      })
      .project({ _id: 1 })
      .toArray();

    const packageIds = packages.map((p) => p._id);

    const stats = await database
      .collection('bookings')
      .aggregate([
        {
          $match: {
            packageId: { $in: packageIds },
          },
        },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ['$bookingStatus', 'confirmed'] }, 1, 0] },
            },
            completedTrips: {
              $sum: { $cond: [{ $eq: ['$bookingStatus', 'completed'] }, 1, 0] },
            },
            totalBookingAmount: { $sum: '$totalAmount' },
            totalConfirmedAmount: {
              $sum: {
                $cond: [{ $eq: ['$bookingStatus', 'confirmed'] }, '$totalAmount', 0],
              },
            },
          },
        },
      ])
      .toArray();

    const bookingStats = stats[0] || {
      totalBookings: 0,
      confirmedBookings: 0,
      completedTrips: 0,
      totalBookingAmount: 0,
      totalConfirmedAmount: 0,
    };

    const activePackages = await database.collection('packages').countDocuments({
      ownerId: req.user.userId,
      isDeleted: { $ne: true },
      status: 'Available',
    });

    return sendSuccess(res, 'Guide statistics retrieved successfully', {
      packagesCreated: packages.length,
      activePackages,
      totalBookings: bookingStats.totalBookings,
      confirmedBookings: bookingStats.confirmedBookings,
      completedTrips: bookingStats.completedTrips,
      totalBookingAmount: bookingStats.totalBookingAmount,
      totalConfirmedAmount: bookingStats.totalConfirmedAmount,
    });
  } catch (error) {
    console.error('Get guide stats error:', error);
    return sendError(res, 'Failed to retrieve guide statistics');
  }
}

// ===============================
// EXPRESS APP SETUP
// ===============================

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
const clientUrls = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['http://localhost:5173'];
app.use(
  cors({
    origin: clientUrls,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TourNest API is running',
    version: '1.0.0',
  });
});

app.get('/api/health', async (req, res) => {
  const dbHealthy = await isHealthy();

  res.json({
    success: true,
    server: 'healthy',
    database: dbHealthy ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ===============================
// ROUTES
// ===============================

// Auth routes
app.post('/api/auth/register', validateRegistration, asyncHandler(register));
app.post('/api/auth/login-email', validateEmailLogin, asyncHandler(loginEmail));
app.post('/api/auth/login', validateLogin, asyncHandler(login));
app.post('/api/auth/logout', authenticate, asyncHandler(logout));
app.get('/api/auth/me', authenticate, asyncHandler(getCurrentUser));
app.post('/api/auth/refresh', authenticate, asyncHandler(refreshToken));

// User routes
app.get('/api/users/me', authenticate, asyncHandler(getProfile));
app.patch('/api/users/me', authenticate, validateUserUpdate, asyncHandler(updateProfile));

// Package routes
app.get('/api/packages', optionalAuth, asyncHandler(getPackages));
app.get('/api/packages/featured', optionalAuth, asyncHandler(getFeaturedPackages));
app.get('/api/packages/my', authenticate, asyncHandler(getMyPackages));
app.post('/api/packages', authenticate, validatePackage, asyncHandler(createPackage));
app.get('/api/packages/:packageId/bookings', authenticate, validateObjectId('packageId'), asyncHandler(getPackageBookings));
app.get('/api/packages/:packageId/booking-summary', authenticate, validateObjectId('packageId'), asyncHandler(getPackageBookingSummary));
app.get('/api/packages/:id', optionalAuth, validateObjectId(), asyncHandler(getPackageById));
app.patch('/api/packages/:id', authenticate, validateObjectId(), validatePackage, asyncHandler(updatePackage));
app.delete('/api/packages/:id', authenticate, validateObjectId(), asyncHandler(deletePackage));

// Booking routes
app.post('/api/bookings', authenticate, validateBooking, asyncHandler(createBooking));
app.get('/api/bookings/my', authenticate, asyncHandler(getMyBookings));
app.get('/api/bookings/:id', authenticate, validateObjectId(), asyncHandler(getBookingById));
app.patch('/api/bookings/:id/status', authenticate, validateObjectId(), validateBookingStatus, asyncHandler(updateBookingStatus));
app.patch('/api/bookings/:id/cancel', authenticate, validateObjectId(), asyncHandler(cancelBooking));
app.get('/api/bookings/:id/invoice', authenticate, validateObjectId(), asyncHandler(getBookingInvoice));

// Payment routes
app.get('/api/payments/my', authenticate, asyncHandler(getMyPayments));
app.get('/api/payments/:id', authenticate, validateObjectId(), asyncHandler(getPaymentById));

// Stats routes
app.get('/api/stats', optionalAuth, asyncHandler(getPlatformStats));
app.get('/api/stats/guides/me/stats', authenticate, asyncHandler(getGuideStats));

// Error handling
app.use(notFound);
app.use(errorHandler);

// ===============================
// SERVER STARTUP & VERCEL EXPORT
// ===============================

// Cache for connection reuse in serverless
let isInitialized = false;

async function initialize() {
  if (isInitialized) return;

  try {
    await connectToDatabase();
    initializeFirebase();
    isInitialized = true;
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// For local development only
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  async function startServer() {
    try {
      await initialize();

      app.listen(PORT, () => {
        console.log('🚀 TourNest Server is running');
        console.log(`📍 Server: http://localhost:${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`⏰ ${new Date().toISOString()}`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  }

  // Error handlers for local development
  process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully...');
    process.exit(0);
  });

  // Start the server locally
  startServer();
}

// Export for Vercel serverless
export default async (req, res) => {
  await initialize();
  return app(req, res);
};
