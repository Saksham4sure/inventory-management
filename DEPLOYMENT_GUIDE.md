# Deployment & Cloudinary Configuration Guide

This guide covers how to configure environment variables, connect **Cloudinary** for image uploads (KYC identity documents), and deploy **StockPulse QR** to production (Backend on Render/Railway, Frontend on Vercel/Netlify).

---

## 1. Cloudinary Setup

Cloudinary hosts KYC documents (citizenship, driving license photos) securely in the cloud with CDN delivery.

### 1.1 Create Free Cloudinary Account
1. Visit [Cloudinary](https://cloudinary.com/) and register for a free account.
2. In your Cloudinary Dashboard, locate:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 1.2 How Cloudinary Works in the Project
- The backend helper is located at `server/src/config/cloudinary.js`.
- When a user uploads identity documents in `server/src/controllers/auth.controller.js`, the images are automatically uploaded to your Cloudinary folder `stockpulse_kyc`.
- The returned secure HTTPS URL (`https://res.cloudinary.com/...`) is stored in MongoDB.
- *Graceful fallback*: If Cloudinary credentials are omitted in local development, it preserves existing data without crashing.

---

## 2. Environment Variables Specification

### Backend: `server/.env`

| Variable | Description | Example / Recommended |
|---|---|---|
| `PORT` | Port the backend listens on | `5000` (Render/Railway auto-sets this) |
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://<user>:<pwd>@cluster.mongodb.net/stockpulse?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `generate-a-64-character-random-hex-string` |
| `JWT_EXPIRES_IN` | Token expiration lifespan | `7d` |
| `CLIENT_URL` | Frontend URL(s) allowed by CORS (comma-separated if multiple) | `https://stockpulse.vercel.app` |
| `BCRYPT_SALT_ROUNDS` | Salt rounds for password hashing | `10` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `abcdefghijklmnopqrstuvwx_yz` |

### Frontend: `client/.env`

| Variable | Description | Example / Value |
|---|---|---|
| `VITE_API_URL` | Full backend API URL ending with `/api` | `https://stockpulse-api.onrender.com/api` |

> In local development, `VITE_API_URL=/api` allows Vite's proxy to forward requests to `http://localhost:5000`. In production on Vercel/Netlify, you must specify the full backend URL (`https://<backend-domain>/api`).

---

## 3. Step-by-Step Deployment Guide

### Phase A: MongoDB Atlas Setup
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a user with read/write permissions.
3. Under **Network Access**, add `0.0.0.0/0` (allow connections from anywhere) so cloud providers (Render, Railway) can reach your cluster.
4. Click **Connect** > **Drivers** > copy the `mongodb+srv://...` URI.

---

### Phase B: Deploy Backend (Render / Railway)

#### Option 1: Render (Recommended)
1. Push your code to GitHub.
2. Log into [Render](https://render.com/) and click **New +** > **Web Service**.
3. Select your repository.
4. Configure service settings:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Environment Variables** and add all variables from Section 2 (`NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `CLOUDINARY_*`, etc.).
6. Click **Deploy Web Service**.
7. Copy your backend URL (e.g. `https://stockpulse-api.onrender.com`).

---

### Phase C: Deploy Frontend (Vercel / Netlify)

#### Option 1: Vercel (Recommended)
1. Go to [Vercel](https://vercel.com/) and click **Add New...** > **Project**.
2. Select your repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL`: `https://stockpulse-api.onrender.com/api` (replace with your Render backend URL)
5. Click **Deploy**.
6. The included `client/vercel.json` rewrite rule handles client-side routing so refreshing any page (like `/dashboard` or `/profile`) will not result in 404s.

---

### Phase D: Link Frontend & Backend CORS
1. Once your frontend is deployed (e.g. `https://stockpulse.vercel.app`), go back to your backend hosting dashboard (Render / Railway).
2. Update the `CLIENT_URL` environment variable:
   ```
   CLIENT_URL=https://stockpulse.vercel.app
   ```
3. Trigger a redeploy of the backend service to apply the updated CORS origin.
