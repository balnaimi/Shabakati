#!/bin/bash

# Script to run both backend and frontend in development mode
# Supports Linux and macOS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Starting Development Server ===${NC}\n"

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed!${NC}"
    echo -e "${YELLOW}Please run: ./scripts/install-nodejs.sh${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}ERROR: Node.js v20 or later is required!${NC}"
    echo -e "${YELLOW}Current version: $(node --version)${NC}"
    echo -e "${YELLOW}Please run: ./scripts/install-nodejs.sh${NC}"
    exit 1
fi

# Load nvm if available
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 22 2>/dev/null || true
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Frontend dependencies not found. Installing...${NC}"
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}Backend dependencies not found. Installing...${NC}"
    cd server
    npm install
    cd ..
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping servers...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${YELLOW}Starting backend server on port 3001...${NC}"
cd "$PROJECT_DIR/server"
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}ERROR: Backend server failed to start!${NC}"
    echo -e "${YELLOW}Check logs: cat /tmp/backend.log${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend server started (PID: $BACKEND_PID)${NC}"

# Start frontend server
echo -e "${YELLOW}Starting frontend server on port 5173...${NC}"
cd "$PROJECT_DIR"
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a bit for frontend to start
sleep 2

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}ERROR: Frontend server failed to start!${NC}"
    echo -e "${YELLOW}Check logs: cat /tmp/frontend.log${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✓ Frontend server started (PID: $FRONTEND_PID)${NC}\n"

echo -e "${GREEN}=== Development servers are running! ===${NC}"
echo -e "${GREEN}Backend API:  http://localhost:3001${NC}"
echo -e "${GREEN}Frontend:     http://localhost:5173${NC}"
echo -e "${GREEN}Network:      http://0.0.0.0:5173 (accessible from local network)${NC}\n"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}\n"

# Show logs
echo -e "${YELLOW}Backend logs:${NC}"
tail -f /tmp/backend.log &
TAIL_PID=$!

# Wait for user interrupt
wait $FRONTEND_PID $BACKEND_PID

# Cleanup
kill $TAIL_PID 2>/dev/null || true
cleanup

