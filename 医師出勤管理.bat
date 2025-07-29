@echo off
chcp 65001
title Doctor Schedule Management
echo ==========================================
echo     Starting Doctor Schedule App...
echo ==========================================
echo.
echo Starting server...
cd /d "%~dp0"
npm run dev
echo.
echo Press Ctrl+C to stop the application
pause