# AquaOps — Kaveri Water Treatment Plant Intelligence System

A full-stack MERN starter implementation with:
- React + Vite frontend
- Express + Node backend
- MongoDB Atlas + Mongoose
- JWT authentication and bcrypt password hashing
- Overview dashboard
- Water quality, chemical dosing, treatment process, alerts, compliance, audit reports, and administration modules
- CRUD APIs, threshold-based alerts, audit events, CSV export

## Prerequisites
- Node.js LTS (Node 20+ recommended)
- A MongoDB Atlas cluster (or any MongoDB connection string)
- A terminal

## 1. Configure MongoDB
1. Create a free cluster at https://www.mongodb.com/cloud/atlas/register
2. In Database Access, create a database user and password.
3. In Network Access, allow your current IP address. For a short local demo only, `0.0.0.0/0` works but is less secure; remove it after testing.
4. Choose Connect > Drivers and copy the connection string.
5. Replace `<password>` and set the database name to `aquaops`.

## 2. Backend
```bash
cd server
cp .env.example .env
```
Edit `.env` and set `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN`.

Then:
```bash
npm install
npm run seed
npm run dev
```
API runs at http://localhost:5000. Demo credentials:
- Username: `admin`
- Password: `AquaOps@123`

Change the demo password before any real deployment.

## 3. Frontend
In another terminal:
```bash
cd client
npm install
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173).

## 4. API overview
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET/POST /api/records/:module`
- `PATCH/DELETE /api/records/:module/:id`
- `GET /api/audit`
- `GET/PATCH /api/settings`
- `GET /api/health`

Valid modules:
`water-quality`, `chemical-dosing`, `treatment-process`, `alerts`, `compliance`

## Notes
- The readings are demo/entered data, not live sensor telemetry. Connect real sensors or a trusted telemetry feed before describing it as real-time plant data.
- Compliance thresholds in this educational demo are configurable placeholders. Confirm applicable regulatory limits with qualified plant personnel before operational use.
- This is a development starter, not a production-hardened industrial control system.
