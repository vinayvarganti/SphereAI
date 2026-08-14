@echo off
title AgentSphere AI - Starter
cls
echo ======================================================================
echo                AgentSphere AI - Startup Assistant
echo ======================================================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ before continuing.
    pause
    exit /b 1
)
echo [OK] Node.js is installed.

:: Check for Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python (3.10 or 3.11 recommended) before continuing.
    pause
    exit /b 1
)
echo [OK] Python is installed.

:: Check for MongoDB
netstat -ano | findstr :27017 >nul
if %errorlevel% neq 0 (
    echo [WARNING] MongoDB does not seem to be running on default port 27017.
    echo           Please make sure MongoDB is running before using database features.
) else (
    echo [OK] MongoDB is running.
)

:: Check for Redis
netstat -ano | findstr :6379 >nul
if %errorlevel% neq 0 (
    echo [WARNING] Redis does not seem to be running on default port 6379.
    echo           Please make sure Redis is running before launching workflows.
) else (
    echo [OK] Redis is running.
)
echo.

:: Setup Backend
echo ----------------------------------------------------------------------
echo Setting up Backend...
echo ----------------------------------------------------------------------
cd backend

if not exist venv (
    echo Creating Python virtual environment (venv)...
    python -m venv venv
)

echo Activating virtual environment and installing dependencies...
call venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies.
    cd ..
    pause
    exit /b 1
)
cd ..

:: Setup Frontend
echo.
echo ----------------------------------------------------------------------
echo Setting up Frontend...
echo ----------------------------------------------------------------------
cd frontend

if not exist node_modules (
    echo Installing frontend dependencies (npm install)...
    call npm install
) else (
    echo Frontend dependencies are already installed.
)
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies.
    cd ..
    pause
    exit /b 1
)
cd ..

:: Launching Services
echo.
echo ----------------------------------------------------------------------
echo Launching Servers...
echo ----------------------------------------------------------------------
echo Starting FastAPI Backend in a new window...
start "AgentSphere AI Backend" cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo Starting Vite Frontend in a new window...
start "AgentSphere AI Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ======================================================================
echo AgentSphere AI is starting!
echo.
echo - Backend API:   http://localhost:8000/docs (Swagger UI)
echo - Frontend App:  http://localhost:5173
echo ======================================================================
echo.
pause
