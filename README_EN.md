# Network Dashboard 🌐

**للنسخة العربية، راجع [README.md](README.md)**

A modern dashboard for managing and monitoring devices on your network with SQLite database.

## Features

- 📡 Network management (add, edit, delete)
- 🔍 Network scanning to automatically discover devices
- 📊 Visual network display (colored squares representing each IP status)
- 📈 Statistics for each network (online, offline, total)
- ➕ Add and manage devices
- 🔍 Search and filter by name, IP, status, and tags
- 🏷️ Tag management with custom colors
- 💾 Save to SQLite database

---

## Requirements

- **Node.js 24 LTS** or later
- **Docker and Docker Compose** (for Production deployment)

---

## 🚀 Production Deployment

### Method 1: Using Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/balnaimi/Shabakati.git
cd Shabakati

# 2. Run the application
docker-compose up -d

# 3. Open your browser
# http://localhost:3001
```

**Container Management:**
```bash
docker-compose stop      # Stop
docker-compose start     # Start
docker-compose down      # Stop and remove
docker-compose logs -f   # View logs
```

### Method 2: Without Docker

```bash
# 1. Install dependencies
npm install
cd server && npm install && cd ..

# 2. Build Frontend
npm run build

# 3. Run Backend
cd server
npm start
```

**Note:** You can use PM2 to manage the background process:
```bash
npm install -g pm2
cd server
pm2 start server.js --name network-dashboard
pm2 save
pm2 startup
```

---

## 💻 Development Mode

### Quick Method: Using Scripts

**Linux / macOS:**
```bash
./scripts/install-nodejs.sh  # Install Node.js and dependencies
./scripts/dev.sh             # Run the application
```

**Windows:**
```powershell
.\scripts\install-nodejs.ps1  # Install Node.js and dependencies (as Administrator)
.\scripts\dev.ps1             # Run the application
```

After running, the application will be available at:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001/api

### Manual Method

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
```

Then open your browser at: http://localhost:5173

---

## 📝 Notes

- Database is created automatically in `server/network.db`
- In Production, the server serves both Frontend files and API from the same port (3001)
- In Development, Frontend runs on port 5173 and server on 3001

---

## 📄 License

See `LICENSE` file for details.
