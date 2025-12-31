# Script to install Node.js v22 LTS and required dependencies for Windows
# Requires PowerShell to be run as Administrator

Write-Host "=== Node.js v22 LTS Installation Script ===" -ForegroundColor Green
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Function to check if command exists
function Test-Command {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Check if Node.js is already installed
if (Test-Command node) {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    
    if ($majorVersion -ge 22) {
        Write-Host "✓ Node.js v22 or later is already installed: $nodeVersion" -ForegroundColor Green
        Write-Host "✓ npm version: $(npm --version)" -ForegroundColor Green
        Write-Host ""
        
        # Install project dependencies
        $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
        $projectDir = Split-Path -Parent $scriptDir
        
        if (Test-Path "$projectDir\package.json") {
            Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
            Set-Location $projectDir
            npm install
            Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
            Write-Host ""
        }
        
        if (Test-Path "$projectDir\server\package.json") {
            Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
            Set-Location "$projectDir\server"
            npm install
            Set-Location $projectDir
            Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
            Write-Host ""
        }
        
        Write-Host "=== Installation Complete! ===" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Node.js version $nodeVersion is installed, but v22+ is required." -ForegroundColor Yellow
        Write-Host "Installing Node.js v22 LTS using nvm-windows..." -ForegroundColor Yellow
        Write-Host ""
    }
}

# Check if nvm-windows is installed
$nvmPath = "$env:ProgramFiles\nvm"
if (-not (Test-Path $nvmPath)) {
    Write-Host "Installing nvm-windows..." -ForegroundColor Yellow
    
    # Download nvm-windows installer
    $nvmInstallerUrl = "https://github.com/coreybutler/nvm-windows/releases/download/1.1.12/nvm-setup.exe"
    $nvmInstallerPath = "$env:TEMP\nvm-setup.exe"
    
    try {
        Write-Host "Downloading nvm-windows installer..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $nvmInstallerUrl -OutFile $nvmInstallerPath
        
        Write-Host "Running nvm-windows installer..." -ForegroundColor Yellow
        Write-Host "Please follow the installation wizard, then run this script again." -ForegroundColor Yellow
        Start-Process -FilePath $nvmInstallerPath -Wait
        
        Write-Host ""
        Write-Host "After nvm-windows installation completes, please:" -ForegroundColor Yellow
        Write-Host "1. Close and reopen PowerShell as Administrator" -ForegroundColor Yellow
        Write-Host "2. Run this script again" -ForegroundColor Yellow
        exit 0
    } catch {
        Write-Host "ERROR: Failed to download or install nvm-windows" -ForegroundColor Red
        Write-Host "Please install nvm-windows manually from: https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✓ nvm-windows is already installed" -ForegroundColor Green
    Write-Host ""
}

# Install Node.js v22 LTS using nvm
Write-Host "Installing Node.js v22 LTS..." -ForegroundColor Yellow
$nvmCmd = "$nvmPath\nvm.exe"

if (Test-Path $nvmCmd) {
    & $nvmCmd install 22
    & $nvmCmd use 22
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    Write-Host "✓ Node.js v22 LTS installed: $(node --version)" -ForegroundColor Green
    Write-Host "✓ npm version: $(npm --version)" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ERROR: nvm.exe not found. Please reinstall nvm-windows." -ForegroundColor Red
    exit 1
}

# Install project dependencies
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptDir

if (Test-Path "$projectDir\package.json") {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location $projectDir
    npm install
    Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
    Write-Host ""
}

if (Test-Path "$projectDir\server\package.json") {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location "$projectDir\server"
    npm install
    Set-Location $projectDir
    Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
    Write-Host ""
}

Write-Host "=== Installation Complete! ===" -ForegroundColor Green
Write-Host "Node.js version: $(node --version)" -ForegroundColor Green
Write-Host "npm version: $(npm --version)" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run the development script: .\scripts\dev.ps1" -ForegroundColor Green

