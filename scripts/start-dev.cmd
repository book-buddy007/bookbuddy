@echo off
rem Book Buddy by VPD - local dev: Docker services, dependency check, API (:3333) + web (:3000)
cd /d "%~dp0.."
title Book Buddy by VPD - setup
echo [1/3] Starting Docker services...
docker compose up -d
echo.
echo [2/3] Installing / repairing dependencies (pnpm)...
call npx -y pnpm@10.30.3 install --config.confirmModulesPurge=false
if errorlevel 1 (
  echo.
  echo Dependency install FAILED - see the messages above.
  pause
  exit /b 1
)
echo.
echo [3/3] Starting API and web app in separate windows...
start "Book Buddy API :3333" cmd /k "cd /d %CD%\backend && npm run start:dev"
start "Book Buddy Web :3000" cmd /k "cd /d %CD% && npm run dev:frontend"
echo.
echo Web app: http://localhost:3000   API: http://localhost:3333/api
echo You can close this window.
pause
