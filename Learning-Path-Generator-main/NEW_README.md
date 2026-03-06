# AI-Powered Personalized Learning Platform 🚀

A full-stack web application that generates personalized, day-by-day learning plans with secure user accounts, interactive progress tracking, and an admin dashboard.

Built with **React + TypeScript** (frontend) and **Express + TypeScript** (backend).

## Features

- **🤖 AI-Powered Path Generation:** Integrates the **Google Gemini API** to generate high-quality, day-by-day learning plans for any topic.
- **🔐 Secure User Authentication:** JWT-based auth with bcrypt password hashing and password strength validation.
- **🔑 Password Recovery:** Multi-step "Forgot Password" flow using a secret question.
- **🗃️ Database Integration:** SQLite for persistent storage of users, learning paths, task progress, and feedback.
- **📊 Interactive Progress Tracking:** Mark tasks complete with checkboxes and see progress via SVG gauge charts.
- **🗓️ Extensible Long-Term Plans:** Generate long-term plans in manageable 7-day chunks, extendable on demand.
- **👍 User Feedback System:** Rate each generated path as helpful or not helpful.
- **👑 Admin Dashboard:** Password-protected admin view to see all user feedback.

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | SQLite (via better-sqlite3) |
| **AI Model** | Google Gemini API |
| **Auth** | JWT + bcrypt |

## Project Structure

```
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/        # Login, Signup, Forgot Password
│   │   │   └── Dashboard/   # Main app, paths, progress, admin
│   │   ├── context/         # Auth context (React Context API)
│   │   ├── services/        # API client (axios)
│   │   ├── types/           # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── server/                  # Express backend
│   ├── src/
│   │   ├── routes/          # auth, paths, admin API routes
│   │   ├── middleware/      # JWT auth middleware
│   │   ├── database.ts      # SQLite operations
│   │   └── index.ts         # Server entry point
│   ├── tsconfig.json
│   └── package.json
├── .env.example
└── README.md
```

## Setup and Local Installation

### 1. Prerequisites

- **Node.js 18+** and **npm**
- A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com)

### 2. Clone the Repository

```bash
git clone https://github.com/your-username/your-repository-name.git
cd your-repository-name
```

### 3. Set Up Environment Variables

Copy the example and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```
GEMINI_API_KEY=your-gemini-api-key
ADMIN_PASSWORD=your-admin-password
JWT_SECRET=any-random-secret-string
PORT=3001
```

### 4. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 5. Run in Development Mode

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the backend at `http://localhost:3001`.

### 6. Build for Production

```bash
# Build the client
cd client
npm run build

# Build the server
cd ../server
npm run build

# Start the production server (serves both API and static files)
NODE_ENV=production node dist/index.js
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/forgot-password/question` | Get security question |
| POST | `/api/auth/forgot-password/verify` | Verify secret answer |
| POST | `/api/auth/forgot-password/reset` | Reset password |
| GET | `/api/paths` | Get all paths for logged-in user |
| POST | `/api/paths/generate` | Generate a new learning path |
| POST | `/api/paths/:id/extend` | Extend an existing path |
| POST | `/api/paths/:id/task` | Update task completion status |
| POST | `/api/paths/:id/feedback` | Submit feedback for a path |
| POST | `/api/admin/login` | Verify admin password |
| GET | `/api/admin/feedback` | Get all feedback (admin only) |
