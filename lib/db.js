/**
 * Database Connection Module
 * Handles MongoDB connection for serverless environment
 */

import { MongoClient, ObjectId } from 'mongodb';

let db = null;
let client = null;

/**
 * Connect to MongoDB database
 */
export async function connectToDatabase() {
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
 * Get database instance
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db;
}

/**
 * Check database connection status
 */
export async function isHealthy() {
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
export async function closeDatabase() {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log('MongoDB connection closed');
  }
}

// Export ObjectId for use in other modules
export { ObjectId };
