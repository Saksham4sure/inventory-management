# StockPulse QR - Inventory Management & QR Tracking System

A full-stack **MERN** (MongoDB, Express.js, React, Node.js) multi-tenant inventory management application featuring automated QR code generation, camera-based barcode/QR scanning, stock audits, and real-time sales/purchase tracking.

---

## 🌟 Key Features

1. **Authentication & User Roles**
   - Secure sign-up, sign-in, and JWT session handling.
   - User roles (`OWNER`, `ADMIN`, `MANAGER`, `STAFF`) with role-based access control.

2. **Business Profile Onboarding (Multi-Tenant Architecture)**
   - Once a user signs up and logs in, they are guided to **Set up their business** (Store name, category, base currency, tax identification, contact details).
   - Strict route-guarding prevents inventory operations until business setup is completed.
   - Multi-tenant data segregation (every product, transaction, and audit record is scoped to the tenant's `businessId`).

3. **QR Code Generation & Physical Label Printing**
   - Creating any inventory product automatically generates a unique, verifiable QR payload (`INV:{businessId}:{SKU}`) and base64 PNG image.
   - Built-in **Label Printer** with SKU, price, and scannable code ready for warehouse shelving and product packaging.
   - Direct PNG download option.

4. **Live QR Scanning & Fast Stock Operations**
   - **Live Camera Scanner**: Scan physical QR codes directly from a phone, tablet, or webcam.
   - **Barcode Gun / Manual Entry**: Supports USB/Bluetooth hardware scanners and manual keyboard fallback.
   - One-click **Quick Sale (Stock-Out)** with real-time stock deductions and negative-inventory prevention.
   - One-click **Quick Purchase (Stock-In)** with automatic stock replenishment.

5. **Analytics & Transaction Audit Trail**
   - Real-time dashboard showing total inventory count, low stock warnings, today's sales, and total purchases.
   - Filterable transactions log with detailed receipt inspection and proof of QR verification.

6. **Subscription-Based Design (Noted Architecture)**
   - Designed with subscription tier structures (`FREE_TRIAL`, `STARTER`, `PRO`).
   - For this initial version, accounts are automatically provisioned with full trial access without payment paywalls.

---

## 📁 Project Structure

```
inventory/
├── package.json              # Root scripts to run both client and server
├── .gitignore                # Global git ignore configuration
├── README.md
├── server/                   # Express.js & MongoDB Backend
│   ├── .env.example          # Backend environment variables template
│   ├── package.json          # Node dependencies (Express, Mongoose, JWT, QRCode, Bcrypt)
│   └── src/
│       ├── app.js            # Express application setup, middlewares, routes
│       ├── server.js         # Entrypoint connecting MongoDB and launching HTTP server
│       ├── config/
│       │   ├── db.js         # Mongoose connection handler
│       │   └── env.js        # Environment configuration
│       ├── constants/
│       │   ├── roles.js              # OWNER, ADMIN, MANAGER, STAFF
│       │   ├── transactionTypes.js   # PURCHASE, SALE, ADJUSTMENT, RETURN
│       │   └── subscriptionPlans.js  # Subscription tiers definition
│       ├── controllers/
│       │   ├── auth.controller.js        # Register, login, profile
│       │   ├── business.controller.js    # Setup business, update settings
│       │   ├── product.controller.js     # Add product, QR generation, QR lookup
│       │   └── transaction.controller.js # Purchases, sales, dashboard metrics
│       ├── middlewares/
│       │   ├── auth.middleware.js        # JWT token verification
│       │   ├── business.middleware.js    # Business onboarding requirement guard
│       │   └── error.middleware.js       # Centralized error handler
│       ├── models/
│       │   ├── user.model.js         # User credentials and business linkage
│       │   ├── business.model.js     # Multi-tenant business profile and subscription state
│       │   ├── product.model.js      # Products with SKU, stock, and QR data
│       │   └── transaction.model.js  # Sales and purchase receipts
│       ├── routes/
│       │   ├── auth.routes.js        # /api/auth
│       │   ├── business.routes.js    # /api/business
│       │   ├── product.routes.js     # /api/products
│       │   ├── transaction.routes.js # /api/transactions
│       │   └── index.js              # Combined API router
│       ├── services/
│       │   ├── auth.service.js       # JWT creation and sanitization
│       │   └── qr.service.js         # QR generation and payload parsing
│       └── utils/
│           ├── apiError.js           # Custom operational error class
│           ├── apiResponse.js        # Consistent JSON envelope
│           └── asyncHandler.js       # Async wrapper for route controllers
│
└── client/                   # React + Tailwind CSS + Vite Frontend
    ├── .env.example          # Client environment variables
    ├── index.html            # Main HTML document
    ├── package.json          # React 19, Tailwind CSS v4, Lucide, Axios, Html5-Qrcode
    ├── vite.config.js        # Vite config with Tailwind plugin & API proxy
    └── src/
        ├── App.jsx           # Root provider wrapper (Auth, Business, Router)
        ├── main.jsx          # Entry point
        ├── index.css         # Tailwind v4 import and base styles
        ├── constants/
        │   ├── config.js     # API endpoints and application defaults
        │   └── routes.js     # Route paths definition
        ├── context/
        │   ├── AuthContext.jsx       # Authentication state and login/register methods
        │   └── BusinessContext.jsx   # Business state and setup methods
        ├── hooks/
        │   ├── useAuth.js            # Hook to access AuthContext
        │   └── useBusiness.js        # Hook to access BusinessContext
        ├── components/
        │   ├── ui/
        │   │   ├── Badge.jsx         # Status and label badges
        │   │   ├── Button.jsx        # Action buttons with loading states
        │   │   ├── Card.jsx          # UI card container
        │   │   ├── Input.jsx         # Form inputs with validation messages
        │   │   └── Modal.jsx         # Dialog modal with keyboard escape handling
        │   ├── common/
        │   │   ├── Navbar.jsx        # Top bar with business name and user controls
        │   │   ├── Sidebar.jsx       # Left navigation bar
        │   │   ├── ProtectedRoute.jsx# Auth requirement guard
        │   │   ├── BusinessRoute.jsx # Business profile setup guard
        │   │   └── QRViewerModal.jsx # Modal for viewing, downloading, and printing QR labels
        │   └── layout/
        │       ├── AuthLayout.jsx    # Centered card layout for Sign in / Sign up
        │       └── DashboardLayout.jsx# App shell with Sidebar and Navbar
        ├── pages/
        │   ├── LoginPage.jsx         # User login
        │   ├── RegisterPage.jsx      # User registration
        │   ├── BusinessSetupPage.jsx # Business onboarding screen
        │   ├── DashboardPage.jsx     # Live metrics, low stock warnings, recent transactions
        │   ├── ProductsPage.jsx      # Products table, search, filters, add modal
        │   ├── QRScanPage.jsx        # Live camera & barcode scanner for Stock-In/Out
        │   └── TransactionsPage.jsx  # Audit log of sales and purchases
        ├── routes/
        │   └── AppRoutes.jsx         # Centralized route tree with guards
        ├── services/
        │   ├── api.js                # Axios instance with interceptors
        │   ├── authService.js        # Auth API calls
        │   ├── businessService.js    # Business API calls
        │   ├── productService.js     # Product & QR API calls
        │   └── transactionService.js # Transactions API calls
        └── utils/
            ├── formatters.js         # Currency and date formatters
            └── storage.js            # LocalStorage persistence helpers
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or newer (v24 tested)
- **MongoDB**: Local MongoDB instance running on port 27017 or a MongoDB Atlas URI

### 1. Installation
Install all dependencies for root, backend, and frontend:
```bash
npm run install:all
```
*(Or run `npm install` inside both `server/` and `client/`)*

### 2. Environment Configuration
Backend (`server/.env`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/inventory_db
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Frontend (`client/.env`):
```env
VITE_API_URL=/api
```

### 3. Run Development Servers
You can start both backend and frontend concurrently:
```bash
npm run dev
```

Or run them individually:
```bash
# Terminal 1: Backend (Express + MongoDB)
npm run dev:server

# Terminal 2: Frontend (React + Vite)
npm run dev:client
```

Frontend URL: `http://localhost:5173`  
Backend API: `http://localhost:5000/api`  
Health Check: `http://localhost:5000/api/health`

---

## 🔄 User Journey & Workflow

1. **Sign Up**: The user creates an account (`/register`).
2. **Setup Business**: Upon registration, the user is redirected to `/business/setup` where they enter their business name, category, currency, and address.
3. **Add Products**: In `/products`, users add catalog items with name, SKU, price, and initial stock. A unique QR code is generated instantly.
4. **Print QR Labels**: Click **View QR** to print physical adhesive labels or download PNGs.
5. **Scan & Track**: Navigate to `/scan` and point a camera at the product label to instantly execute:
   - **Sale (Stock-Out)**: Decrements stock and records revenue.
   - **Purchase (Stock-In)**: Increments stock and records expense.
6. **Audit & Dashboard**: View real-time revenue, low stock alerts, and receipt histories on the Dashboard and Transactions pages.
