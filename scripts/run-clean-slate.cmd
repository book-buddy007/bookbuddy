@echo off
rem Book Buddy by VPD - runs scripts\clean-slate.ps1 without prompts; transcript in scripts\clean-slate.log
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\clean-slate.ps1 -Yes -AdminEmail braj.kt2050@gmail.com -LogFile scripts\clean-slate.log
echo.
echo Finished. You can close this window.
pause
