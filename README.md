# Mail Management System (MERN + Tailwind)

A clean, minimal dashboard application for company mail account management.

## Features

- Login-only system (no public registration).
- Admin can create **admins** and **normal users**.
- Admin can add mail records with:
  - email
  - password
  - assigned user
  - status
  - reason
- Admin can view all mail records in one table.
- Normal users can:
  - log in
  - update their own username/password
  - view only the mail records assigned to them

## Tech Stack

- **Frontend**: React (JSX) + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Auth**: JWT

## Project Structure

- `backend` → Express API + MongoDB models/routes
- `frontend` → React app (`.jsx`) + Tailwind UI

## Backend setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend environment values (`backend/.env`):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/mail-management
JWT_SECRET=replace-with-strong-secret
DEFAULT_ADMIN_USERNAME=superadmin
DEFAULT_ADMIN_PASSWORD=admin123
MAIL_SERVER_BASE_URL=https://mail.yourdomain.com
# use one key for both read and write
MAIL_SERVER_API_KEY=your-mail-server-api-key
# optional split keys (override MAIL_SERVER_API_KEY for each action)
MAIL_SERVER_API_KEY_READ=your-read-key
MAIL_SERVER_API_KEY_WRITE=your-write-key
```

> On first start, default admin user is auto-created if missing.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Optional frontend env (`frontend/.env`):

```env
VITE_API_URL=https://your-api-domain/api
```

## Core API endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/admin/users` (admin only)
- `GET /api/admin/users?role=user` (admin only)
- `POST /api/mails` (admin only)
- `GET /api/mails` (admin sees all, user sees own)
- `PUT /api/users/me` (self profile update)

