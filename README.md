<div align="center">

# 🌍 TourNest Backend API

**Complete REST API Backend for Local Travel Guide Booking Platform**

[![Node](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.18-white.svg)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-green.svg)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 📚 Table of Contents

- [Overview](#overview)
- [Technology Stack](#-technology-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Security](#-security)
- [Authentication Flow](#-authentication-flow)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Error Codes](#-error-codes)

---

## 🎯 Overview

TourNest Backend is a production-ready REST API server built with Node.js, Express, and MongoDB. It provides complete backend functionality for a travel guide booking platform, including user authentication, package management, booking system, payment tracking, and comprehensive security features.

### Key Highlights

- 🔐 **Dual Authentication**: Firebase token verification + JWT
- 💰 **Server-side Price Calculation**: Prevents price manipulation
- 📊 **Real-time Capacity Checking**: Prevents overbooking
- 🛡️ **Comprehensive Security**: Rate limiting, CORS, Helmet, input validation
- 📝 **MongoDB Native Driver**: Efficient database operations
- 🌱 **Seed Data**: 12 realistic Bangladesh travel packages

---

## 🛠️ Technology Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | 18+ |
| **Express.js** | Web Framework | 4.18+ |
| **MongoDB** | Database | 6.0+ |
| **MongoDB Driver** | Database Client | 6.3+ |
| **JWT** | Authentication Tokens | 9.0+ |
| **Firebase Admin** | Firebase Token Verification | 12.0+ |
| **Helmet** | Security Headers | 7.1+ |
| **CORS** | Cross-Origin Requests | 2.8+ |
| **Morgan** | HTTP Logging | 1.10+ |
| **express-rate-limit** | Rate Limiting | 7.1+ |

---

## ✨ Features

### Authentication & Authorization
- ✅ Firebase token verification with Admin SDK
- ✅ JWT generation and validation
- ✅ Protected route middleware
- ✅ Role-based access control (user, guide, admin)
- ✅ Token refresh mechanism

### Package Management
- ✅ Create, read, update, delete packages
- ✅ Advanced filtering (category, destination, price range)
- ✅ Full-text search
- ✅ Pagination support
- ✅ Featured packages endpoint
- ✅ Soft delete for packages with bookings

### Booking System
- ✅ Server-side price calculation
- ✅ Real-time capacity validation
- ✅ Duplicate booking prevention
- ✅ Booking status management
- ✅ Cancellation support
- ✅ Invoice generation data

### Payment Tracking
- ✅ Automatic payment record creation
- ✅ Payment history retrieval
- ✅ Transaction ID generation
- ✅ Refund status tracking

### Statistics
- ✅ Platform-wide statistics
- ✅ Guide-specific analytics
- ✅ Real-time booking summaries
- ✅ Revenue tracking

### Security
- ✅ Rate limiting (100 req/15min, 5 for auth)
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Input validation & sanitization
- ✅ MongoDB injection protection
- ✅ Ownership verification

---

## 📁 Project Structure

```
server/
├── 📄 index.js                    # Server entry point
├── 📦 package.json                # Dependencies & scripts
├── 🔧 .env.example                # Environment template
├── 🔐 .env                        # Actual config (gitignored)
├── 📝 .gitignore                  # Git ignore rules
├── 📖 README.md                   # This file
│
├── 🗄️ config/
│   ├── db.js                      # MongoDB connection + indexes
│   └── firebase.js                # Firebase Admin SDK setup
│
├── 🔐 middleware/
│   ├── auth.js                    # Authentication middleware
│   ├── errorHandler.js            # Global error handlers
│   └── validate.js                # Input validation
│
├── 🛣️ routes/
│   ├── auth.routes.js             # /api/auth/*
│   ├── users.routes.js            # /api/users/*
│   ├── packages.routes.js         # /api/packages/*
│   ├── bookings.routes.js         # /api/bookings/*
│   ├── payments.routes.js         # /api/payments/*
│   └── stats.routes.js            # /api/stats/*
│
├── 🎮 controllers/
│   ├── auth.controller.js         # Auth logic
│   ├── user.controller.js         # User logic
│   ├── package.controller.js      # Package logic
│   ├── booking.controller.js      # Booking logic
│   ├── payment.controller.js      # Payment logic
│   └── stats.controller.js        # Statistics logic
│
├── 🛠️ utils/
│   ├── jwt.js                     # JWT utilities
│   ├── response.js                # Response formatters
│   └── validation.js              # Validation helpers
│
└── 🌱 seed/
    └── seed.js                    # Database seeding
```

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:

- **Node.js** v16 or higher installed
- **MongoDB** (local instance or MongoDB Atlas account)
- **Firebase Project** with Authentication enabled

### Installation Steps

#### 1. Navigate to Server Directory

```bash
cd server
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your actual configuration:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/tournest
DB_NAME=tournest

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Firebase Admin
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key\n-----END PRIVATE KEY-----\n"

# CORS
CLIENT_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create or select your project
3. Enable **Email/Password** and **Google** sign-in methods
4. Navigate to **Project Settings → Service Accounts**
5. Click **Generate New Private Key**
6. Copy values to your `.env` file

#### 5. Start MongoDB

```bash
# Local MongoDB
mongod

# Or ensure MongoDB Atlas connection string is correct
```

#### 6. Run the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

#### 7. Seed Database (Optional)

```bash
npm run seed
```

This creates:
- 1 guide user
- 12 realistic Bangladesh travel packages

### Verify Installation

```bash
curl http://localhost:5000/
```

Expected response:
```json
{
  "success": true,
  "message": "TourNest API is running",
  "version": "1.0.0"
}
```

---

## 🔑 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` / `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/tournest` |
| `DB_NAME` | Database name | `tournest` |
| `JWT_SECRET` | JWT signing secret | Use `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `your-project-id` |
| `FIREBASE_CLIENT_EMAIL` | Firebase service email | `firebase-adminsdk@...` |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | `"-----BEGIN PRIVATE KEY-----..."` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

---

## 🌐 API Documentation

### Base URL

```
Development: http://localhost:5000/api
Production:  https://your-domain.com/api
```

### Authentication

Add JWT token to Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### API Endpoints Summary

| Category | Endpoints | Auth |
|----------|-----------|------|
| **Health** | `GET /`, `GET /api/health` | Public |
| **Auth** | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/refresh` | Mixed |
| **Users** | `GET /api/users/me`, `PATCH /api/users/me` | JWT |
| **Packages** | `GET /api/packages`, `POST /api/packages`, `GET /api/packages/:id`, etc. | Mixed |
| **Bookings** | `POST /api/bookings`, `GET /api/bookings/my`, `PATCH /api/bookings/:id/status`, etc. | JWT |
| **Payments** | `GET /api/payments/my`, `GET /api/payments/:id` | JWT |
| **Stats** | `GET /api/stats`, `GET /api/guides/me/stats` | Mixed |

### Detailed Endpoints

#### 🔷 Health Check

##### GET /

Root endpoint - API health check

```bash
curl http://localhost:5000/
```

**Response:**
```json
{
  "success": true,
  "message": "TourNest API is running",
  "version": "1.0.0"
}
```

##### GET /api/health

Detailed health check with database status

```bash
curl http://localhost:5000/api/health
```

**Response:**
```json
{
  "success": true,
  "server": "healthy",
  "database": "connected",
  "environment": "development",
  "timestamp": "2026-08-13T09:00:00.000Z"
}
```

---

#### 🔷 Authentication

##### POST /api/auth/login

Authenticate user with Firebase token and receive JWT

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseToken": "firebase_id_token_here"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "photoURL": "https://example.com/photo.jpg",
      "role": "user"
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid Firebase token"
}
```

##### POST /api/auth/logout

Logout (client removes token)

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer <token>"
```

##### GET /api/auth/me

Get current authenticated user

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

##### POST /api/auth/refresh

Refresh JWT token

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Authorization: Bearer <token>"
```

---

#### 🔷 User Profile

##### GET /api/users/me

Get current user profile

```bash
curl http://localhost:5000/api/users/me \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "photoURL": "https://example.com/photo.jpg",
    "role": "user",
    "createdAt": "2026-08-01T00:00:00.000Z",
    "lastLoginAt": "2026-08-13T09:00:00.000Z"
  }
}
```

##### PATCH /api/users/me

Update user profile

```bash
curl -X PATCH http://localhost:5000/api/users/me \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Updated",
    "photoURL": "https://example.com/new-photo.jpg"
  }'
```

---

#### 🔷 Packages

##### GET /api/packages

Get all packages with filtering and pagination

```bash
curl "http://localhost:5000/api/packages?page=1&limit=12&category=Cultural%20Experience&minPrice=500&maxPrice=3000&search=heritage&sort=-createdAt"
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 12 | Items per page (max: 100) |
| `search` | string | - | Search in title, destination, description, category, guide |
| `category` | string | - | Filter by category |
| `destination` | string | - | Filter by destination |
| `status` | string | - | Filter by status (Available/Unavailable) |
| `minPrice` | number | - | Minimum price |
| `maxPrice` | number | - | Maximum price |
| `sort` | string | createdAt | Sort field (e.g., `-price`) |

**Response:**
```json
{
  "success": true,
  "message": "Packages fetched successfully",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Old Dhaka Heritage Walk",
      "category": "Cultural Experience",
      "destination": "Old Dhaka, Bangladesh",
      "description": "Explore the historic heart...",
      "itinerary": "Morning: Start at Curzon Hall...",
      "image": "https://images.unsplash.com/...",
      "price": 1200,
      "duration": "5 hours",
      "maxTravelers": 8,
      "status": "Available",
      "guideName": "Ahmed Rahman",
      "createdAt": "2026-08-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 12,
    "totalPages": 4
  }
}
```

##### GET /api/packages/featured

Get 6 featured packages (latest)

```bash
curl http://localhost:5000/api/packages/featured
```

##### GET /api/packages/my

Get packages owned by current user

```bash
curl http://localhost:5000/api/packages/my \
  -H "Authorization: Bearer <token>"
```

##### GET /api/packages/:id

Get single package by ID

```bash
curl http://localhost:5000/api/packages/507f1f77bcf86cd799439011
```

##### POST /api/packages

Create new package (requires authentication)

```bash
curl -X POST http://localhost:5000/api/packages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sundarbans Adventure Tour",
    "category": "Adventure Trip",
    "destination": "Sundarbans, Khulna",
    "description": "Explore the world'\''s largest mangrove forest...",
    "itinerary": "Day 1: Depart from Khulna...",
    "image": "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e",
    "price": 5500,
    "duration": "3 days",
    "maxTravelers": 12,
    "status": "Available"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Package created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "title": "Sundarbans Adventure Tour",
    ...
  }
}
```

##### PATCH /api/packages/:id

Update package (only owner can update)

```bash
curl -X PATCH http://localhost:5000/api/packages/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Package Title",
    "price": 1500,
    "status": "Unavailable"
  }'
```

##### DELETE /api/packages/:id

Delete package (soft delete if bookings exist)

```bash
curl -X DELETE http://localhost:5000/api/packages/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```

##### GET /api/packages/:packageId/bookings

Get all bookings for a package (owner/admin only)

```bash
curl http://localhost:5000/api/packages/507f1f77bcf86cd799439011/bookings \
  -H "Authorization: Bearer <token>"
```

##### GET /api/packages/:packageId/booking-summary

Get booking summary (owner/admin only)

```bash
curl http://localhost:5000/api/packages/507f1f77bcf86cd799439011/booking-summary \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "maxTravelers": 8,
    "bookedTravelers": 5,
    "remainingTravelers": 3,
    "bookingCount": 3,
    "totalCollected": 6000
  }
}
```

---

#### 🔷 Bookings

##### POST /api/bookings

Create new booking (price calculated server-side)

```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "507f1f77bcf86cd799439011",
    "phone": "+8801234567890",
    "address": "123 Main Street, Dhaka",
    "travelDate": "2026-09-15",
    "numberOfTravelers": 2,
    "additionalMessage": "Looking forward to this trip!"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "packageId": "507f1f77bcf86cd799439011",
    "packageTitle": "Old Dhaka Heritage Walk",
    "numberOfTravelers": 2,
    "totalAmount": 2400,
    "bookingStatus": "pending",
    "travelDate": "2026-09-15T00:00:00.000Z",
    "bookingDate": "2026-08-13T09:00:00.000Z"
  }
}
```

##### GET /api/bookings/my

Get current user's bookings

```bash
curl "http://localhost:5000/api/bookings/my?page=1&status=confirmed" \
  -H "Authorization: Bearer <token>"
```

##### GET /api/bookings/:id

Get single booking (owner, package owner, or admin)

```bash
curl http://localhost:5000/api/bookings/507f1f77bcf86cd799439013 \
  -H "Authorization: Bearer <token>"
```

##### PATCH /api/bookings/:id/status

Update booking status (package owner or admin)

```bash
curl -X PATCH http://localhost:5000/api/bookings/507f1f77bcf86cd799439013/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```

##### PATCH /api/bookings/:id/cancel

Cancel booking

```bash
curl -X PATCH http://localhost:5000/api/bookings/507f1f77bcf86cd799439013/cancel \
  -H "Authorization: Bearer <token>"
```

##### GET /api/bookings/:id/invoice

Get invoice data

```bash
curl http://localhost:5000/api/bookings/507f1f77bcf86cd799439013/invoice \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invoiceNumber": "TN-2026-99939013",
    "travelerName": "John Doe",
    "travelerEmail": "john@example.com",
    "packageTitle": "Old Dhaka Heritage Walk",
    "category": "Cultural Experience",
    "destination": "Old Dhaka, Bangladesh",
    "travelDate": "2026-09-15T00:00:00.000Z",
    "numberOfTravelers": 2,
    "totalAmount": 2400,
    "bookingStatus": "confirmed",
    "bookingDate": "2026-08-13T09:00:00.000Z"
  }
}
```

---

#### 🔷 Payments

##### GET /api/payments/my

Get payment history

```bash
curl "http://localhost:5000/api/payments/my?page=1" \
  -H "Authorization: Bearer <token>"
```

##### GET /api/payments/:id

Get single payment (owner or admin)

```bash
curl http://localhost:5000/api/payments/507f1f77bcf86cd799439014 \
  -H "Authorization: Bearer <token>"
```

---

#### 🔷 Statistics

##### GET /api/stats

Get platform statistics

```bash
curl http://localhost:5000/api/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalPackages": 45,
    "totalBookings": 320,
    "totalCompletedTrips": 195
  }
}
```

##### GET /api/guides/me/stats

Get guide-specific statistics

```bash
curl http://localhost:5000/api/guides/me/stats \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "packagesCreated": 8,
    "activePackages": 6,
    "totalBookings": 45,
    "confirmedBookings": 38,
    "completedTrips": 32,
    "totalBookingAmount": 126000,
    "totalConfirmedAmount": 108000
  }
}
```

---

## 📊 Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  name: String,
  email: String,           // unique index
  photoURL: String,
  role: String,           // "user" | "guide" | "admin"
  firebaseUid: String,     // unique index
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date
}
```

**Indexes:**
- `email` (unique)
- `firebaseUid` (unique)
- `role`
- `createdAt`

### Packages Collection

```javascript
{
  _id: ObjectId,
  title: String,
  category: String,        // "City Tour" | "Adventure Trip" | "Cultural Experience" | "Food & Heritage Tour"
  destination: String,
  description: String,
  itinerary: String,
  image: String,
  price: Number,
  duration: String,
  maxTravelers: Number,
  status: String,          // "Available" | "Unavailable"
  guideName: String,
  guideEmail: String,
  ownerId: String,         // references users._id
  createdAt: Date,
  updatedAt: Date,
  isDeleted: Boolean       // for soft delete
}
```

**Indexes:**
- `ownerId`
- `category`
- `status`
- `destination`
- `createdAt`
- `price`
- Compound: `{ status: 1, category: 1, createdAt: -1 }`

### Bookings Collection

```javascript
{
  _id: ObjectId,
  packageId: ObjectId,     // references packages._id
  packageOwnerId: String,  // denormalized for efficient queries
  packageTitle: String,    // denormalized snapshot
  category: String,        // denormalized snapshot
  destination: String,     // denormalized snapshot
  price: Number,           // denormalized snapshot
  travelerId: String,      // references users._id
  travelerName: String,    // denormalized snapshot
  travelerEmail: String,   // denormalized snapshot
  travelerImage: String,
  phone: String,
  address: String,
  travelDate: Date,
  numberOfTravelers: Number,
  totalAmount: Number,     // server-side calculation
  bookingStatus: String,   // "pending" | "confirmed" | "cancelled" | "completed" | "rejected"
  bookingDate: Date,
  additionalMessage: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `travelerId`
- `packageId`
- `packageOwnerId`
- `bookingStatus`
- `bookingDate`
- `travelDate`
- Compound: `{ travelerId: 1, bookingDate: -1 }`
- Compound: `{ packageId: 1, bookingStatus: 1 }`

### Payments Collection

```javascript
{
  _id: ObjectId,
  bookingId: ObjectId,     // references bookings._id (unique)
  packageId: ObjectId,     // references packages._id
  travelerId: String,      // references users._id
  travelerEmail: String,
  packageTitle: String,
  category: String,
  destination: String,
  amount: Number,
  currency: String,        // "BDT"
  paymentStatus: String,   // "paid" | "pending" | "failed" | "refunded"
  transactionId: String,
  paymentDate: Date,
  createdAt: Date
}
```

**Indexes:**
- `travelerId`
- `bookingId` (unique)
- `packageId`
- `paymentDate`

---

## 🔒 Security

### Implemented Security Measures

| Feature | Implementation |
|---------|---------------|
| **Firebase Verification** | All Firebase tokens verified with Admin SDK |
| **JWT Authentication** | Additional JWT layer with 7-day expiration |
| **Rate Limiting** | 100 req/15min, 5 req for auth endpoints |
| **CORS** | Configured by CLIENT_URL environment variable |
| **Helmet** | Security headers (HSTS, X-Frame-Options, etc.) |
| **Input Validation** | All inputs validated before processing |
| **SQL Injection Protection** | Safe MongoDB query construction |
| **XSS Protection** | Output sanitization, Helmet XSS filter |
| **Ownership Verification** | Users can only modify their own resources |
| **Price Protection** | Server-side price calculation |
| **Capacity Protection** | Server-side capacity validation |
| **Duplicate Prevention** | Duplicate booking checks |
| **Soft Delete** | Preserves booking history |

### Security Middleware Stack

```javascript
Request
  ↓
[Rate Limiter] ← 100 req/15min
  ↓
[CORS] ← Configured origins
  ↓
[Helmet] ← Security headers
  ↓
[Body Parser] ← Size limits
  ↓
[Authentication] ← JWT verification
  ↓
[Authorization] ← Role/ownership checks
  ↓
[Validation] ← Input sanitization
  ↓
[Controller] ← Business logic
  ↓
Response
```

---

## 🔐 Authentication Flow

```
┌─────────────┐                    ┌─────────────┐                   ┌──────────────┐
│   Frontend  │                    │   Backend   │                   │   Firebase   │
└──────┬──────┘                    └──────┬──────┘                   └──────┬───────┘
       │                                  │                                  │
       │ 1. Firebase Login               │                                  │
       │─────────────────────────────────>│                                  │
       │                                  │                                  │
       │                                  │ 2. Verify Token                  │
       │                                  │──────────────────────────────────>│
       │                                  │                                  │
       │                                  │ 3. User Data                     │
       │                                  │<─────────────────────────────────│
       │                                  │                                  │
       │ 4. Create/Update User            │                                  │
       │ 5. Generate JWT                  │                                  │
       │<─────────────────────────────────│                                  │
       │                                  │                                  │
       │ 6. JWT Token                     │                                  │
       │─────────────────────────────────>│                                  │
       │                                  │                                  │
       │ 7. Store Token                  │                                  │
       │                                  │                                  │
       │                                  │                                  │
       │ 8. API Request + JWT             │                                  │
       │─────────────────────────────────>│                                  │
       │                                  │                                  │
       │ 9. Verify JWT                    │                                  │
       │ 10. Return Data                  │                                  │
       │<─────────────────────────────────│                                  │
```

### Token Format

**JWT Payload:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "user",
  "iat": 1692252800,
  "exp": 1692857600
}
```

---

## 🧪 Testing

### Postman Collection

Import the following as a Postman collection:

```json
{
  "info": {
    "name": "TourNest API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{baseUrl}}/"
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "raw",
          "raw": "{\"firebaseToken\":\"{{firebaseToken}}\"}"
        },
        "url": "{{baseUrl}}/api/auth/login"
      }
    }
  ]
}
```

### cURL Examples

```bash
# Health check
curl http://localhost:5000/

# Login with Firebase
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"firebaseToken":"your_firebase_token"}'

# Get packages with filters
curl "http://localhost:5000/api/packages?category=Cultural%20Experience&minPrice=500&maxPrice=3000&page=1&limit=12"

# Create package
curl -X POST http://localhost:5000/api/packages \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Package",
    "category": "City Tour",
    "destination": "Dhaka",
    "description": "Amazing tour",
    "itinerary": "Day 1: City walk",
    "image": "https://example.com/image.jpg",
    "price": 1500,
    "duration": "1 day",
    "maxTravelers": 10,
    "status": "Available"
  }'

# Create booking
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "package_id_here",
    "phone": "+8801234567890",
    "address": "Dhaka, Bangladesh",
    "travelDate": "2026-09-15",
    "numberOfTravelers": 2
  }'

# Get my bookings
curl http://localhost:5000/api/bookings/my \
  -H "Authorization: Bearer your_jwt_token"
```

---

## 🚀 Deployment

### Production Checklist

- [ ] Update `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET`
- [ ] Use MongoDB Atlas connection string
- [ ] Update `CLIENT_URL` to production domain
- [ ] Configure Firebase Admin credentials
- [ ] Enable CORS for production domain only
- [ ] Set appropriate rate limits
- [ ] Configure reverse proxy (nginx)
- [ ] Enable HTTPS
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tournest
DB_NAME=tournest
JWT_SECRET=<generate_with_openssl_rand_base64_32>
JWT_EXPIRES_IN=7d
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
CLIENT_URL=https://your-frontend-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Vercel Deployment

1. Set environment variables in Vercel dashboard
2. Deploy using Vercel CLI:
```bash
vercel --prod
```

### Railway Deployment

1. Connect GitHub repository
2. Configure environment variables
3. Deploy automatically on push

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

**Build and run:**
```bash
docker build -t tournest-server .
docker run -p 5000:5000 --env-file .env tournest-server
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.tournest.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🛡️ Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource or capacity conflict |
| 422 | Validation Error | Input validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
  "success": false,
  "message": "Error description"
}
```

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

---

## 📝 License

This project is created for educational purposes.

---

## 👥 Contributing

This is an academic project. For improvements:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📞 Support

For issues or questions:
- Create an issue in the repository
- Contact the development team

---

<div align="center">

**Built with ❤️ using Node.js, Express, and MongoDB**

</div>
