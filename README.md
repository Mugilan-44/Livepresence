# Prolync LivePresence

People operations platform for employee onboarding, attendance, work logs, collaboration and founder insights.

## Project structure

```text
.
├── frontend/                 # React + Vite application
│   ├── src/                  # Pages, components, styles and API client
│   ├── public/               # Static files and brand assets
│   ├── .env.example          # Frontend environment template
│   └── vite.config.js
├── backend/                  # Express API and persistence layer
│   ├── routes/               # API route modules
│   ├── services/             # Email and other backend services
│   ├── schema.sql            # Database schema
│   ├── .env.example          # Backend environment template
│   └── server.js             # API entry point
├── .env.example              # Environment-file guide
└── package.json              # Root convenience scripts
```

## Local setup

```bash
# Install dependencies once
npm run install:frontend
npm run install:backend

# Configure local environment files
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env.local

# Terminal 1: API at http://localhost:5001
npm run dev:backend

# Terminal 2: web app at http://localhost:3000
npm run dev:frontend
```

The default local backend uses the SQLite-compatible project database when `LOCAL_DB=true`. For production, set `DATABASE_URL` in `backend/.env` and set `VITE_API_URL` in `frontend/.env`.

## Root scripts

- `npm run dev:frontend` — start Vite
- `npm run dev:backend` — start the Express API
- `npm run build` — build the frontend for production
- `npm start` — start the backend production entry point
