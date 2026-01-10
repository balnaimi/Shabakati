# Script to run both backend and frontend in development mode for Windows

Write-Host "=== Starting Development Server ===" -ForegroundColor Green
Write-Host ""

# Get script directory and project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptDir

Set-Location $projectDir

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please run: .\scripts\install-nodejs.ps1" -ForegroundColor Yellow
    exit 1
}

# Check Node.js version
$nodeVersion = node --version
$majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($majorVersion -lt 24) {
    Write-Host "ERROR: Node.js v24 or later is required!" -ForegroundColor Red
    Write-Host "Current version: $nodeVersion" -ForegroundColor Yellow
    Write-Host "Please run: .\scripts\install-nodejs.ps1" -ForegroundColor Yellow
    exit 1
}

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "Frontend dependencies not found. Installing..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path "server\node_modules")) {
    Write-Host "Backend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location "$projectDir\server"
    npm install
    Set-Location $projectDir
}

# Function to cleanup on exit
function Cleanup {
    Write-Host "`nStopping servers..." -ForegroundColor Yellow
    if ($backendProcess) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendProcess) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Cleanup } | Out-Null

# Start backend server
Write-Host "Starting backend server on port 3001..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:projectDir
    Set-Location server
    npm run dev
}

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Check if backend job is running
if ($backendJob.State -ne "Running") {
    Write-Host "ERROR: Backend server failed to start!" -ForegroundColor Red
    Receive-Job $backendJob
    Remove-Job $backendJob -Force
    exit 1
}

Write-Host "✓ Backend server started" -ForegroundColor Green

# Start frontend server in new window
Write-Host "Starting frontend server on port 5173..." -ForegroundColor Yellow
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectDir'; npm run dev" -PassThru

# Wait a bit for frontend to start
Start-Sleep -Seconds 3

# Check if frontend process is running
if (-not $frontendProcess -or $frontendProcess.HasExited) {
    Write-Host "ERROR: Frontend server failed to start!" -ForegroundColor Red
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "✓ Frontend server started" -ForegroundColor Green
Write-Host ""

Write-Host "=== Development servers are running! ===" -ForegroundColor Green
Write-Host "Backend API:  http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend:     http://localhost:5173" -ForegroundColor Green
Write-Host "Network:      http://0.0.0.0:5173 (accessible from local network)" -ForegroundColor Green
Write-Host ""
Write-Host "Backend is running in a background job." -ForegroundColor Yellow
Write-Host "Frontend is running in a separate PowerShell window." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the backend server." -ForegroundColor Yellow
Write-Host "Close the frontend window to stop the frontend server." -ForegroundColor Yellow
Write-Host ""

# Show backend logs
try {
    Receive-Job $backendJob -Wait
} catch {
    Write-Host "Backend server stopped." -ForegroundColor Yellow
} finally {
    Cleanup
    Remove-Job $backendJob -Force -ErrorAction SilentlyContinue
}

