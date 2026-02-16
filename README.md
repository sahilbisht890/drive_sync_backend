# 🚀 Google Drive Sync Backend

A Node.js backend service that syncs files between two Google Drive folders using **rclone**, Google OAuth2 authentication, and scheduled jobs.
## 📌 Features

* Google OAuth2 authentication
* Access & refresh token management
* Rclone-based Drive-to-Drive sync
* Cron-based scheduled sync
* MongoDB persistence
* MyDrive / Shared Drive support
* Production-ready Linux deployment

## 🏗️ Tech Stack

* Node.js
* Express.js
* MongoDB + Mongoose
* Google OAuth2
* Rclone
* Node-cron
* Ngrok (for local OAuth callback)

# 📂 Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Windows
# RCLONE_PATH=C:\\Users\\your-user\\rclone\\rclone\\rclone.exe

# Linux / Mac
RCLONE_PATH=/usr/bin/rclone

RCLONE_REMOTE_NAME=gdrive
AUTH_SECRET=your_random_secret

DRIVE_FOLDER_SRC_NAME=test_source
DRIVE_FOLDER_DEST_NAME=test_dest

DRIVE_FOLDER_SRC_ID=your_source_folder_id

BACKEND_URL=https://your-ngrok-url.ngrok.io

DRIVE_IS_MYDRIVE=true

# ⚙️ Local Setup Guide

## 1️⃣ Clone the repository

```bash
git clone <your-repo-url>
cd <project-folder>
```

---

## 2️⃣ Install dependencies

```bash
npm install
```

---

## 3️⃣ Install Rclone

### 🔹 Linux (Ubuntu)

```bash
sudo apt install rclone
```

Verify:

```bash
rclone version
```

---

### 🔹 Windows

Download from:
[https://rclone.org/downloads/](https://rclone.org/downloads/)

Then update:

```env
RCLONE_PATH=C:\\Users\\your-user\\rclone\\rclone\\rclone.exe
```

---

## 4️⃣ Setup MongoDB

You can use:

* MongoDB Atlas (recommended)
* Or local MongoDB

Update:

```env
MONGO_URI=your_connection_string
```

---

# 🌐 Running Locally with Ngrok (Important for Google OAuth)

Since Google OAuth requires a public callback URL, we use **ngrok**.

---

## Step 1: Start backend

```bash
npm run dev
```

or

```bash
node server.js
```

It should run on:

```
http://localhost:5000
```

---

## Step 2: Start Ngrok

```bash
ngrok http 5000
```

You will get a public URL like:

```
https://abc123.ngrok.io
```

---

## Step 3: Update .env

Replace:

```env
BACKEND_URL=https://abc123.ngrok.io
```

Restart the server after updating.

---

## Step 4: Update Google Cloud Console

Go to:

👉 Google Cloud Console → Credentials → OAuth 2.0 Client

Add this to **Authorized redirect URIs**:

```
https://abc123.ngrok.io/auth/google/callback
```

Save changes.

---

# ▶️ Run the Project

```bash
npm run dev
```

Then open:

```
https://abc123.ngrok.io/auth/google
```

Login and authorize.

---

# 🔁 How Sync Works

1. User authenticates via Google OAuth
2. Tokens are saved in MongoDB
3. Rclone config file is generated dynamically
4. Cron job runs sync command:

   ```
   rclone sync gdrive:source gdrive:destination
   ```
5. Sync logs are stored in DB

---

# 📦 Production Deployment (Linux VPS)

1. Install Node.js
2. Install Rclone
3. Setup PM2:

```bash
npm install pm2 -g
pm2 start server.js --name drive-sync
pm2 save
pm2 startup
```

4. Set `BACKEND_URL` to your real domain

5. Add correct OAuth redirect URI in Google Console

---

# 🛠️ Common Issues

### ❌ redirect_uri_mismatch

Make sure:

* BACKEND_URL matches exactly
* Google Console redirect URI matches
* HTTPS is used

# 📌 Folder Configuration

| Variable               | Description                              |
| ---------------------- | ---------------------------------------- |
| DRIVE_FOLDER_SRC_NAME  | Source folder name in Drive              |
| DRIVE_FOLDER_DEST_NAME | Destination folder name                  |
| DRIVE_FOLDER_SRC_ID    | Source folder ID                         |
| DRIVE_IS_MYDRIVE       | true for MyDrive, false for Shared Drive |

-* Add API documentation section
* Optimize it for recruiters / portfolio showcase
