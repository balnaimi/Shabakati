# Network Dashboard 🌐

**For Arabic version, see [README.md](README.md)**

A modern dashboard for managing and monitoring devices on your network with SQLite database.

## Features

- 📡 Network and device management
- 🔍 Automatic network scanning to discover devices
- 📊 Visual statistics display
- 🏷️ Tag management
- 💾 SQLite database

---

## 🚀 Production Deployment (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/balnaimi/Shabakati.git
cd Shabakati

# 2. Copy .env.example to .env
cp .env.example .env

# 3. Edit .env file and update the following values:
#    ALLOWED_ORIGINS=http://your-ip:3001 or http://your-domain:3001
#    BASE_URL=http://your-ip:3001 or http://your-domain:3001
#    Example: ALLOWED_ORIGINS=http://192.168.1.100:3001
#    Example: BASE_URL=http://192.168.1.100:3001

# 4. Save the file

# 5. Run the application (Production - daemon mode)
docker compose up --build -d
```

The application will be available at: http://localhost:3001

---

## 💻 Development Mode

```bash
# 1. Install Node.js 24 LTS (if not already installed)

# 2. Install dependencies
npm install
cd server && npm install && cd ..

# 3. Navigate to scripts folder and run the script
cd scripts
./dev.sh
```

After running, the application will be available at:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001/api

---

## 🔄 Reset Database

```bash
cd server
node resetDatabase.js
```

---

## 📄 License

See `LICENSE` file for details.
