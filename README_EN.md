# Network Dashboard 🌐

A modern dashboard for managing and monitoring devices on your network with SQLite database.

## Features

### Network Management
- 📡 Network management (add, edit, delete)
- 🔍 Network scanning to automatically discover devices
- 📊 Visual network display (colored squares representing each IP status)
- 📈 Statistics for each network (online, offline, total)

### Device Management
- ➕ Add new devices (automatically through scanning or manually)
- 📋 Display devices in an organized table
- 🔍 Search by name or IP
- 🔄 Filter by connection status (online/offline)
- 🏷️ Filter by tags
- ⬆️⬇️ Ascending/descending sort on all columns
- ✏️ Edit device tags
- 🗑️ Delete devices (individual or bulk)

### Monitoring and Status Check
- 💾 Save to SQLite database
- 🔄 Check device status (online/offline)
- 📊 Detailed statistics (total, connected, disconnected)
- 📅 Display addition date and last check date

### Tag Management
- 🏷️ Tag management with custom colors
- 🔗 Link tags to devices
- 🎨 Visual tag display in tables

---

## ⚡ Quick Start

The easiest way to run the application in development mode:

### Linux / macOS:
```bash
# 1. Install Node.js and dependencies
./scripts/install-nodejs.sh

# 2. Run the application in development mode
./scripts/dev.sh
```

### Windows:
```powershell
# 1. Install Node.js and dependencies (run PowerShell as Administrator)
.\scripts\install-nodejs.ps1

# 2. Run the application in development mode
.\scripts\dev.ps1
```

After running the scripts, the application will be available at:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001/api
- **From local network:** http://<SERVER_IP>:5173

**Note:** If you prefer manual installation, see the sections below.

---

## 🚀 Installation and Setup

### Requirements

- Node.js (Version 20 or later - Recommended: v22.x.x LTS)
- npm or yarn
- Linux, Windows, or macOS

### Installing Node.js v22 LTS

**⚠️ Important:** The application requires Node.js v22.x.x LTS. Make sure you install the correct version.

#### Quick Method: Using Automated Scripts

**Linux / macOS:**
```bash
./scripts/install-nodejs.sh
```

This script automatically:
- Checks for required programs (curl, git, build tools)
- Installs them if missing
- Installs nvm
- Installs Node.js v22 LTS
- Installs all project dependencies (npm install)

**Windows:**
```powershell
# Run PowerShell as Administrator
.\scripts\install-nodejs.ps1
```

This script automatically:
- Installs nvm-windows
- Installs Node.js v22 LTS
- Installs all project dependencies

#### Manual Method: Using nvm (Node Version Manager)

nvm allows you to easily manage and switch between Node.js versions:

**Linux / macOS:**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload terminal or run:
source ~/.bashrc  # or ~/.zshrc depending on your shell

# Install Node.js v22 LTS
nvm install 22

# Use Node.js v22 as default
nvm use 22
nvm alias default 22

# Verify installation
node --version  # Should show v22.x.x
npm --version
```

**Windows:**
Use [nvm-windows](https://github.com/coreybutler/nvm-windows):
1. Download and install from: https://github.com/coreybutler/nvm-windows/releases
2. Open Command Prompt or PowerShell as Administrator
3. Run:
```cmd
nvm install 22
nvm use 22
node --version
```

#### Direct Installation (without nvm)

**Linux (Ubuntu/Debian):**
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Linux (Fedora/RHEL/CentOS):**
```bash
# Add NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -

# Install Node.js
sudo dnf install -y nodejs

# Verify installation
node --version
npm --version
```

**macOS:**
```bash
# Using Homebrew (if installed)
brew install node@22

# Or download from official website:
# https://nodejs.org/en/download/
# Choose "macOS Installer (.pkg)" for v22 LTS version
```

**Windows:**
1. Go to: https://nodejs.org/
2. Download the LTS version (v22.x.x)
3. Run the installer (.msi file)
4. Follow the installation steps
5. Open a new Command Prompt and test:
```cmd
node --version
npm --version
```

#### Verifying Installation

After installation, make sure the version is correct:
```bash
node --version  # Should show v22.x.x or later
npm --version   # Should show npm version
```

If an older version appears, make sure to:
- Reopen terminal/command prompt
- Check PATH environment variable
- If using nvm, make sure to run `nvm use 22`

### Quick Steps

#### 1️⃣ Install Frontend Dependencies

Open a terminal and navigate to the project folder:

```bash
cd /path/to/Shabakati
npm install
```

#### 2️⃣ Install Backend Dependencies

In the same terminal or a new one:

```bash
cd /path/to/Shabakati/server
npm install
```

**Note**: If you encounter issues installing `better-sqlite3`, you may need to install build tools:

```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3-dev

# macOS
xcode-select --install

# Fedora/RHEL
sudo dnf groupinstall "Development Tools"
sudo dnf install python3-devel
```

---

## 💻 Development Mode

### Quick Method: Using Script

**Linux / macOS:**
```bash
./scripts/dev.sh
```

**Windows:**
```powershell
.\scripts\dev.ps1
```

This script automatically:
- Starts the backend server on port 3001
- Starts the frontend server on port 5173
- Displays links and helpful messages

### Manual Method:

#### Terminal 1 - Run Backend Server

```bash
cd /path/to/Shabakati/server
npm run dev
```

✅ **Server will run on:** `http://0.0.0.0:3001` (accessible from all interfaces)

**⚠️ Keep this terminal open!**

#### Terminal 2 - Run Frontend

Open a **new terminal** (don't close the server terminal):

```bash
cd /path/to/Shabakati
npm run dev
```

✅ **Frontend will run on:** `http://0.0.0.0:5173` (accessible from all interfaces)

#### Open the Application

**From the same server:**
Open your browser and go to:
```
http://localhost:5173
```

**From any device on the local network:**
Open your browser and go to:
```
http://<SERVER_IP>:5173
```
where `<SERVER_IP>` is the server's IP address on the network (example: `http://192.168.1.100:5173`)

**Note:** Make sure the firewall allows connections on ports 3001 and 5173.

---

## 🚀 Production Deployment

### Step 1: Build Frontend

```bash
cd /path/to/Shabakati
npm run build
```

This will create a `dist/` folder containing production files.

### Step 2: Setup Backend

#### Option A: Using Node.js directly

```bash
cd /path/to/Shabakati/server
npm start
```

#### Option B: Using PM2 (Recommended)

Install PM2:
```bash
npm install -g pm2
```

Run Backend with PM2:
```bash
cd /path/to/Shabakati/server
pm2 start server.js --name network-dashboard-api
pm2 save
pm2 startup
```

**PM2 Management:**
```bash
pm2 list              # Show all processes
pm2 logs              # Show logs
pm2 restart network-dashboard-api  # Restart
pm2 stop network-dashboard-api     # Stop
pm2 delete network-dashboard-api   # Delete
```

### Step 3: Setup Reverse Proxy (Nginx)

Create Nginx configuration file `/etc/nginx/sites-available/network-dashboard`:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Frontend - Static files
    location / {
        root /path/to/Shabakati/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/network-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: SSL Setup (HTTPS) - Recommended

Using Certbot:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Step 5: Environment Variables (Optional)

You can create a `.env` file in the `server/` folder:

```env
PORT=3001
NODE_ENV=production
```

And modify `server.js` to read these variables.

---

## 📁 Interface and Pages

### Main Page (Dashboard)
- Display general statistics (number of networks, number of devices, online/offline devices)
- List of networks with statistics for each
- Button to delete all data

### Network Management
- Display list of all networks
- Add new network (name, Network ID, Subnet)
- Edit existing network
- Delete network (with deletion of all its devices)
- Display last scan date

### Network View
- Visual network display (colored squares representing each IP)
  - 🟢 Green: device online
  - 🔴 Red: device offline
  - ⚪ White: no device
- Table of all devices in the network
- Network scan to discover devices
- Delete all network devices
- Device filtering (by status, tag, search)
- Device sorting (name, IP, status, last check)
- Edit tags for each device

### Tag Management
- Display list of all tags
- Add new tag (with custom color)
- Edit existing tag
- Delete tag

---

## 📁 Project Structure

```
Shabakati/
├── src/                    # Frontend code (React)
│   ├── components/         # Shared components
│   │   └── ErrorBoundary.jsx
│   ├── pages/              # Main pages
│   │   ├── HostsList.jsx   # Main page - Dashboard
│   │   ├── NetworksList.jsx # Network management
│   │   ├── NetworkView.jsx # Network view
│   │   └── TagsManagement.jsx # Tag management
│   ├── utils/              # Helper functions
│   │   ├── api.js          # API functions
│   │   └── networkUtils.js # Network calculation functions
│   ├── constants.js        # Constants
│   ├── App.jsx
│   └── main.jsx
├── server/                 # Server code (Node.js)
│   ├── server.js           # Main server file
│   ├── database.js         # Database management
│   ├── networkScanner.js   # Network scanning
│   ├── networkUtils.js     # Network calculation functions
│   ├── package.json
│   └── network.db          # Database file (created automatically)
├── dist/                   # Build files (after npm run build)
├── public/                 # Static files
│   └── favicon.svg
├── package.json            # Frontend dependencies
├── vite.config.js          # Vite configuration
└── README.md
```

---

## 💾 Database

- **Type**: SQLite
- **Location**: `server/network.db`
- **Tables**:
  - `networks` - Networks
  - `hosts` - Devices
  - `tags` - Tags
  - `host_tags` - Tag-device relationships
  - `host_status_history` - Device status history

### networks table:
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT) - Network name
- `network_id` (TEXT) - Network ID (e.g., 192.168.1.0)
- `subnet` (INTEGER) - Subnet mask (e.g., 24)
- `created_at` (TEXT) - Creation date
- `last_scanned` (TEXT) - Last scan date

### hosts table:
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT) - Device name
- `ip` (TEXT) - IP address
- `network_id` (INTEGER) - Network ID (FOREIGN KEY)
- `description` (TEXT) - Description
- `url` (TEXT) - URL link
- `status` (TEXT) - Status (online/offline)
- `created_at` (TEXT) - Addition date
- `last_checked` (TEXT) - Last check date
- `ping_latency` (REAL) - Response time
- `packet_loss` (REAL) - Packet loss
- `uptime_percentage` (REAL) - Uptime percentage

### Indexes:
Indexes added for performance optimization:
- `idx_hosts_ip` - On IP column
- `idx_hosts_status` - On status column
- `idx_hosts_network_id` - On network_id
- `idx_host_tags_host_id` - On host_id in host_tags
- `idx_host_tags_tag_id` - On tag_id in host_tags
- `idx_status_history_host_id` - On host_id in host_status_history

### Backup:

To create a database backup:
```bash
cp server/network.db server/network.db.backup
```

To restore from backup:
```bash
cp server/network.db.backup server/network.db
```

---

## 🔌 API Endpoints

### Networks
- `GET /api/networks` - Get all networks
- `GET /api/networks/:id` - Get a single network
- `POST /api/networks` - Add a new network
- `PUT /api/networks/:id` - Update a network
- `DELETE /api/networks/:id` - Delete a network (with all its devices)
- `GET /api/networks/:id/hosts` - Get network devices
- `POST /api/networks/:id/scan` - Scan network to discover devices
- `DELETE /api/networks/:id/hosts` - Delete all network devices

### Devices (Hosts)
- `GET /api/hosts` - Get all devices
- `GET /api/hosts/:id` - Get a single device
- `POST /api/hosts` - Add a new device
- `PUT /api/hosts/:id` - Update a device
- `DELETE /api/hosts/:id` - Delete a device
- `POST /api/hosts/:id/check-status` - Check device status
- `GET /api/hosts/:id/history` - Get status history

### Tags
- `GET /api/tags` - Get all tags
- `GET /api/tags/:id` - Get a single tag
- `POST /api/tags` - Add a new tag
- `PUT /api/tags/:id` - Update a tag
- `DELETE /api/tags/:id` - Delete a tag

### Statistics and Management
- `GET /api/stats` - Get general statistics
- `DELETE /api/data/all` - Delete all data (devices, networks, tags)

### Import/Export
- `GET /api/export` - Export data (JSON)
- `POST /api/import` - Import data (JSON)

---

## 📖 Usage Guide

### Add a New Network
1. Go to "Network Management" page
2. Click "Add New Network"
3. Enter:
   - Network name (e.g., "Main Network")
   - Network ID (e.g., 192.168.1.0)
   - Subnet (e.g., 24)
4. Click "Add"

### Scan Network
1. Go to network view page
2. Click "Scan Network"
3. Wait for scan to complete
4. Devices will be automatically discovered and added

### Manage Devices in Network
- **Filtering**: Use search and filter fields at the top of the table
- **Sorting**: Click on column header to sort
- **Edit Tags**: Click "Edit" next to the device
- **Delete**: Click "Delete" to remove the device

### Manage Tags
1. Go to "Tag Management"
2. Click "Add New Tag"
3. Enter tag name and choose color
4. Click "Add"

---

## 🛠️ Technologies Used

### Frontend
- **React 18** - UI library
- **Vite** - Fast build tool
- **React Router** - Routing
- **CSS3** - Styling
- **Tajawal Font** - Arabic font from Google Fonts

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **SQLite (better-sqlite3)** - Database
- **CORS** - Cross-origin requests
- **ping** - Device status check (ICMP)
- **net** - Port scanning

---

## ⚡ Performance Optimizations

### Database
- ✅ Indexes on frequently used columns
- ✅ Batch tag fetching instead of loops
- ✅ Optimized queries

### Network Scanner
- ✅ Parallel ICMP (ping) and port scanning
- ✅ Support for 26 common ports (Linux, Windows, popular services)
- ✅ Optimized timeout for faster scanning

### React Frontend
- ✅ Use `useCallback` and `useMemo` to reduce re-renders
- ✅ Use `Intl.Collator` for fast Arabic text sorting
- ✅ Lazy loading for pages

---

## 🔧 Troubleshooting

### Error: "Port 3001 already in use"
**Solution:** 
- Close the program using port 3001
- Or change the port in `server/server.js`

### Error: "Cannot find module"
**Solution:** 
- Run `npm install` in the folder where the error appears
- Make sure all dependencies are installed in both folders

### Error: "EADDRINUSE" on port 5173
**Solution:** 
- Close the frontend terminal and restart it
- Or change the port in `vite.config.js`

### Error: "Network request failed"
**Solution:** 
- Make sure the server is running on `http://localhost:3001`
- Make sure the server is running before the frontend

### Error installing `better-sqlite3`
**Solution:** 
- Make sure build tools are installed (build-essential, python3-dev)
- Refer to the "Requirements" section above

### Devices don't appear after scan
**Solution:** 
- Make sure the scan completed (wait for success message)
- Make sure devices are on the same network
- Try scanning a specific IP first

### Squares don't show colors
**Solution:** 
- Make sure subnet is /24 or larger
- Large networks (/16) may not display squares

---

## 📝 Additional Notes

- Database is created automatically on first server run
- Data is stored in `server/network.db` file
- You can copy `network.db` file for backup
- All fonts use **Tajawal** Arabic font from Google Fonts
- Application fully supports RTL (right-to-left)
- For production deployment, use PM2 and Nginx as shown above

---

## 📄 License

See `LICENSE` file for details.

---

**Last Updated:** 2024


