#!/bin/bash

# Script to install Node.js v22 LTS and required dependencies
# Supports Linux (Ubuntu/Debian/Fedora/RHEL) and macOS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Node.js v22 LTS Installation Script ===${NC}\n"

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if [ -f /etc/debian_version ]; then
        OS="debian"
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
    else
        OS="linux"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo -e "${RED}Unsupported OS. This script supports Linux and macOS only.${NC}"
    exit 1
fi

echo -e "${YELLOW}Detected OS: $OS${NC}\n"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install dependencies on Debian/Ubuntu
install_debian_deps() {
    echo -e "${YELLOW}Installing required packages for Debian/Ubuntu...${NC}"
    sudo apt-get update
    sudo apt-get install -y curl git build-essential python3-dev
}

# Function to install dependencies on RHEL/Fedora
install_rhel_deps() {
    echo -e "${YELLOW}Installing required packages for RHEL/Fedora...${NC}"
    if command_exists dnf; then
        sudo dnf install -y curl git gcc gcc-c++ make python3-devel
    else
        sudo yum install -y curl git gcc gcc-c++ make python3-devel
    fi
}

# Function to install dependencies on macOS
install_macos_deps() {
    echo -e "${YELLOW}Installing required packages for macOS...${NC}"
    
    # Check for Xcode Command Line Tools
    if ! xcode-select -p &>/dev/null; then
        echo -e "${YELLOW}Installing Xcode Command Line Tools...${NC}"
        xcode-select --install
        echo -e "${YELLOW}Please complete the Xcode Command Line Tools installation, then run this script again.${NC}"
        exit 1
    fi
    
    # Install Homebrew if not exists (optional but recommended)
    if ! command_exists brew; then
        echo -e "${YELLOW}Homebrew not found. Installing Homebrew (optional but recommended)...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install git and curl via Homebrew if not available
    if ! command_exists git; then
        brew install git
    fi
    if ! command_exists curl; then
        brew install curl
    fi
}

# Install system dependencies
echo -e "${YELLOW}Checking and installing system dependencies...${NC}"

if [ "$OS" == "debian" ]; then
    if ! command_exists curl || ! command_exists git || ! command_exists gcc; then
        install_debian_deps
    fi
elif [ "$OS" == "rhel" ]; then
    if ! command_exists curl || ! command_exists git || ! command_exists gcc; then
        install_rhel_deps
    fi
elif [ "$OS" == "macos" ]; then
    install_macos_deps
fi

echo -e "${GREEN}✓ System dependencies installed${NC}\n"

# Check if Node.js is already installed
if command_exists node; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 22 ]; then
        echo -e "${GREEN}✓ Node.js v22 or later is already installed: $(node --version)${NC}"
        echo -e "${GREEN}✓ npm version: $(npm --version)${NC}\n"
        
        # Check if nvm is available
        if [ -s "$HOME/.nvm/nvm.sh" ]; then
            echo -e "${YELLOW}Installing project dependencies...${NC}"
            source "$HOME/.nvm/nvm.sh"
        fi
        
        # Install project dependencies
        if [ -f "package.json" ]; then
            echo -e "${YELLOW}Installing frontend dependencies...${NC}"
            npm install
        fi
        
        if [ -f "server/package.json" ]; then
            echo -e "${YELLOW}Installing backend dependencies...${NC}"
            cd server
            npm install
            cd ..
        fi
        
        echo -e "${GREEN}✓ Installation complete!${NC}"
        exit 0
    else
        echo -e "${YELLOW}Node.js version $(node --version) is installed, but v22+ is required.${NC}"
        echo -e "${YELLOW}Installing Node.js v22 LTS using nvm...${NC}\n"
    fi
fi

# Install nvm if not exists
if [ ! -s "$HOME/.nvm/nvm.sh" ]; then
    echo -e "${YELLOW}Installing nvm (Node Version Manager)...${NC}"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    echo -e "${GREEN}✓ nvm installed${NC}\n"
else
    echo -e "${GREEN}✓ nvm is already installed${NC}\n"
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
fi

# Install Node.js v22 LTS
echo -e "${YELLOW}Installing Node.js v22 LTS...${NC}"
nvm install 22
nvm use 22
nvm alias default 22

echo -e "${GREEN}✓ Node.js v22 LTS installed: $(node --version)${NC}"
echo -e "${GREEN}✓ npm version: $(npm --version)${NC}\n"

# Install project dependencies
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if [ -f "package.json" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}\n"
fi

if [ -f "server/package.json" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd server
    npm install
    cd ..
    echo -e "${GREEN}✓ Backend dependencies installed${NC}\n"
fi

echo -e "${GREEN}=== Installation Complete! ===${NC}"
echo -e "${GREEN}Node.js version: $(node --version)${NC}"
echo -e "${GREEN}npm version: $(npm --version)${NC}\n"
echo -e "${YELLOW}Note: If you open a new terminal, you may need to run:${NC}"
echo -e "${YELLOW}  source ~/.nvm/nvm.sh${NC}"
echo -e "${YELLOW}  nvm use 22${NC}\n"
echo -e "${GREEN}You can now run the development script: ./scripts/dev.sh${NC}"

