/**
 * Vercel Serverless Function - Main Handler
 */

import express from 'express';
import { connectToDatabase, getDb, isHealthy } from '../lib/db.js';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import cors from 'cors';
import helmet from 'helmet';

// Cache for connection reuse
let cachedDb = null;
let cachedApp = null;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Initialize Firebase
function initializeFirebase() {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('⚠️ Firebase credentials not configured');
      return null;
    }

    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });

    console.log('✅ Firebase Admin initialized');
    return admin;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    return null;
  }
}

// Create Express app
function createApp() {
  if (cachedApp) return cachedApp;

  const app = express();

  // Middleware
  app.use(helmet());

  const clientUrls = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['*'];
  app.use(cors({
    origin: clientUrls,
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/health', async (req, res) => {
    try {
      const db = await connectToDatabase();
      const healthy = await isHealthy();

      res.json({
        success: true,
        server: 'healthy',
        database: healthy ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message,
      });
    }
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'TourNest API is running',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
    });
  });

  // API info endpoint
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'TourNest API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        packages: '/api/packages',
        auth: '/api/auth/login',
      },
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
      ...(process.env.NODE_ENV === 'development' && { error: err.message }),
    });
  });

  cachedApp = app;
  return app;
}

// Main handler
export default async function handler(req, res) {
  // Connect to database
  if (!cachedDb) {
    cachedDb = await connectToDatabase();
  }

  // Initialize Firebase if needed
  if (!admin.apps.length) {
    initializeFirebase();
  }

  // Get and use Express app
  const app = createApp();

  return app(req, res);
}
