@echo off
rem Book Buddy by VPD - read-only look at the webyn server (nothing is changed on it).
rem Uses YOUR SSH login. If it asks for a password, type the server's root password.
title Book Buddy by VPD - server check
set "SERVER=root@168.220.248.127"
echo Connecting to %SERVER% ...
echo.
ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 %SERVER% "echo '== system'; . /etc/os-release; echo $PRETTY_NAME; echo cpus: $(nproc); free -h | sed -n 2p; df -h / | tail -1; echo; echo '== docker'; docker --version 2>&1; echo; echo '== coolify'; if [ -d /data/coolify ]; then echo installed; cat /data/coolify/source/.env 2>/dev/null | grep -E '^APP_URL|^APP_PORT' ; else echo NOT installed; fi; echo; echo '== containers'; docker ps --format '{{.Names}}  |  {{.Image}}  |  {{.Status}}' 2>&1 | head -40; echo; echo '== listening ports'; ss -tlnH 2>/dev/null | awk '{print $4}' | sort -u | tr '\n' ' '; echo"
echo.
echo Finished. You can close this window.
pause
