# Network Dashboard 🌐

**For Arabic version, see [README.md](README.md)**

A modern dashboard for managing and monitoring devices on your network with SQLite database.

## Features

- 📡 Network and device management
- 🔍 Automatic and manual network scanning to discover devices
- 📊 Visual statistics display
- 🏷️ Complete tag management
- 💾 SQLite database
- 🌐 Multi-language support (Arabic/English) with easy switching
- 🌓 Dark/Light mode
- ⭐ Favorites and groups management (create, edit, delete, reorder)
- 🔐 Authentication system (Admin and Visitor)
- 🔑 Password change (Admin and Visitor)
- 📈 Detailed network view with device grouping
- 📊 Comprehensive statistics (online/offline devices)
- 🎯 Modern and responsive user interface

---

## 📑 Available Pages

- **Setup Page** - Initial password setup on first run
- **Login Page** - User authentication
- **Networks List** - View and manage all networks
- **Network View** - Detailed view of a specific network with device grouping
- **Hosts List** - View all devices across all networks
- **Favorites** - Manage favorite devices and groups
- **Tags Management** - Create and manage tags
- **Change Admin Password** - Change administrator password
- **Change Visitor Password** - Change visitor password

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

The application will be available at: http://your-ip:3001 or http://your-domain:3001

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

## 👤 Add Admin User

To add a new admin user:

```bash
cd server
node addAdmin.js [username] [password]
```

Or using environment variable:

```bash
cd server
ADMIN_PASSWORD=yourpassword node addAdmin.js [username]
```

**Example:**
```bash
cd server
node addAdmin.js admin mypassword123
```

---

## 📦 Dependencies

### Frontend
- React 18.3.1
- React DOM 18.3.1
- React Router DOM 6.28.0
- Vite 7.2.7 (Build tool)

### Backend
- Express 4.22.1
- SQLite (better-sqlite3 12.6.0)
- bcrypt 6.0.0 (Password hashing)
- jsonwebtoken 9.0.3 (Authentication)
- winston 3.19.0 (Logging)
- ping 1.0.0 (Host checking)
- validator 13.15.26 (Data validation)

### Requirements
- Node.js 24 LTS or later

---

## 📄 License

See `LICENSE` file for details.
