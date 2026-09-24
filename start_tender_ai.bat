@echo off
title TenderAI - Intelligent Tender Analysis Engine
echo ========================================================
echo         Starting TenderAI Software System
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching Backend API Server on Port 8000...
start "TenderAI Backend" cmd /k "cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Launching Frontend Web Server on Port 3000...
start "TenderAI Frontend" cmd /k "cd frontend && python -m http.server 3000 --bind 127.0.0.1"

timeout /t 2 /nobreak >nul

echo.
echo ========================================================
echo   TenderAI is running! Opening browser at:
echo   http://localhost:3000
echo ========================================================
start http://localhost:3000

echo.
echo Keep the backend and frontend terminal windows open while using the software.
echo Press any key to exit this launcher window.
pause >nul
