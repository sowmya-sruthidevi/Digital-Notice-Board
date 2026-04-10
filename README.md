# 📺 Multimedia Notice Display System

A real-time multimedia notice display system with authentication, file uploads, QR code access, and multi-device screen support.

## ✨ Features

- **Authentication** — JWT-based signup & login with bcrypt password hashing
- **Multimedia Notices** — Text, Image, Video, and Audio support
- **Real-time Updates** — Socket.IO pushes changes to all connected displays instantly
- **File Upload** — Multer handles images, videos, and audio with validation (max 20MB)
- **QR Code** — Auto-generated QR to open the display page on any device
- **Offline Support** — Display page caches content in localStorage
- **Welcome Email** — NodeMailer sends a styled welcome email on signup
- **Multi-device** — Works on phones, tablets, laptops, and smart TVs

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Real-time | Socket.IO |
| Auth | JWT, bcryptjs |
| Upload | Multer |
| Email | NodeMailer (Gmail SMTP) |
| QR | qrcode |
| Frontend | Vanilla HTML/CSS/JS |

## 📁 Project Structure

```
notice-system/
├── server/
│   ├── server.js          # Express + Socket.IO server
│   ├── config/db.js       # MongoDB connection
│   ├── models/
│   │   ├── User.js        # User model (name, email, password)
│   │   └── Notice.js      # Notice model (type, content, duration)
│   ├── routes/
│   │   ├── auth.js        # POST /auth/signup, /auth/login
│   │   └── notice.js      # POST/GET/DELETE /notice(s), GET /qr
│   ├── middleware/auth.js  # JWT verification middleware
│   └── utils/mailer.js    # NodeMailer welcome email
├── client/
│   ├── index.html         # Login page
│   ├── signup.html        # Signup page
│   ├── admin.html         # Admin dashboard
│   ├── display.html       # Fullscreen display page
│   ├── css/style.css      # Dark glassmorphism theme
│   └── js/
│       ├── login.js       # Login logic
│       ├── signup.js      # Signup logic
│       ├── admin.js       # Dashboard logic (CRUD, QR, Socket)
│       └── display.js     # Playlist player (transitions, offline)
├── uploads/               # Media files (auto-created)
│   ├── images/
│   ├── videos/
│   └── audio/
├── .env.example           # Environment variable template
├── package.json
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ installed
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running
- A Gmail account with [App Password](https://support.google.com/accounts/answer/185833) (for email)

### Step 1: Clone / Download

Download or extract this project folder.

### Step 2: Install Dependencies

```bash
cd notice-system
npm install
```

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
MONGO_URI=mongodb://localhost:27017/notice-system
JWT_SECRET=pick-a-strong-random-secret-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
PORT=3000
```

**Gmail App Password Setup:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to App Passwords → Generate one for "Mail"
4. Use that 16-character password as `EMAIL_PASS`

### Step 4: Start MongoDB

```bash
# On Windows
mongod

# On Mac (Homebrew)
brew services start mongodb-community

# On Linux
sudo systemctl start mongod
```

### Step 5: Start the Server

```bash
# Development (auto-restarts on changes)
npm run dev

# Production
npm start
```

You should see:
```
✅ MongoDB connected successfully
🚀 Server running on http://0.0.0.0:3000
📺 Display page: http://localhost:3000/display.html
🔧 Admin panel:  http://localhost:3000/admin.html
```

### Step 6: Open in Browser

- **Admin Dashboard**: http://localhost:3000/admin.html
- **Display Page**: http://localhost:3000/display.html

## 📱 Connecting Other Devices (Phone, TV, etc.)

1. Make sure your devices are on the **same WiFi network**
2. Find your computer's local IP:
   - **Windows**: Open CMD → type `ipconfig` → look for "IPv4 Address" (e.g., `192.168.1.100`)
   - **Mac/Linux**: Open Terminal → type `ifconfig` or `ip addr` → look for `inet` under your WiFi adapter
3. On your phone/TV browser, go to: `http://192.168.1.100:3000/display.html`
4. Or scan the **QR code** shown on the admin dashboard!

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | ❌ | Create account |
| POST | `/auth/login` | ❌ | Login, get JWT |
| POST | `/notice` | ✅ | Create notice (multipart for files) |
| GET | `/notices` | ❌ | List all notices |
| DELETE | `/notice/:id` | ✅ | Delete a notice |
| GET | `/qr` | ❌ | Get QR code data URL |

## 🧪 Example Test Data

After signing up and logging in, try creating:

1. **Text Notice**: Type "Welcome to our office!" — Duration: 8s
2. **Image Notice**: Upload a JPG/PNG — Duration: 10s
3. **Video Notice**: Upload an MP4 — Duration: auto (plays full video)
4. **Audio Notice**: Upload an MP3 — Duration: auto (plays full audio)

Open the display page to see them loop automatically!

## 📡 Real-time Flow

```
Admin creates notice
       ↓
Server saves to MongoDB
       ↓
Socket.IO emits "notice:added"
       ↓
All display clients receive event
       ↓
Display reloads playlist instantly
```

## 🔒 Security Notes

- Passwords are hashed with bcrypt (12 rounds)
- JWT tokens expire after 7 days
- File uploads are validated by MIME type and limited to 20MB
- Only authenticated users can create/delete notices
- Display page is public (by design — for screens)

## 📄 License

MIT — Free to use and modify.
