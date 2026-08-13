/**
 * TourNest Server - Vercel Compatible Entry Point
 * Local Travel Guide Booking Platform Backend API
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';

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
    console.warn('⚠️ Firebase credentials not configured');
    return null;
  }

  try {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
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
 * Async Error Wrapper
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ===============================
// EXPRESS APP SETUP
// ===============================

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const clientUrls = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['*'];
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

app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TourNest API is running',
    version: '1.0.0',
  });
});

app.get('/health', async (req, res) => {
  const dbHealthy = await isHealthy();

  res.json({
    success: true,
    server: 'healthy',
    database: dbHealthy ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// ===============================
// INITIALIZATION & EXPORT
// ===============================

// Cache for connection reuse
let isInitialized = false;

// Initialize function
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

// For local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  initialize().then(() => {
    app.listen(PORT, () => {
      console.log('🚀 TourNest Server is running');
      console.log(`📍 Server: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ ${new Date().toISOString()}`);
    });
  }).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

// Export for Vercel
export default async (req, res) => {
  await initialize();
  return app(req, res);
};
