@echo off
rem Book Buddy by VPD - commit and push this folder to GitHub (log: scripts\push-github.log)
cd /d "%~dp0.."
title Book Buddy by VPD - push to GitHub
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\push-github.ps1 -LogFile scripts\push-github.log
echo.
echo Finished. You can close this window.
pause
