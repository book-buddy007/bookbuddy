@echo off
rem Book Buddy by VPD - safe disk cleanup on the webyn server (168.220.248.127).
rem Removes ONLY: old system journal (keeps 500 MB), rotated/archived log files,
rem and Docker images no container uses that are older than 7 days.
rem Does NOT touch: running apps, their volumes/databases, Coolify backups.
rem Also lists the 3 loose Docker volumes and /root contents (read-only) for review.
title Book Buddy by VPD - server cleanup
cd /d "%~dp0"
echo Connecting to the webyn server. Type the root password when asked.
echo.
ssh -o StrictHostKeyChecking=accept-new root@168.220.248.127 "echo '===== BEFORE'; df -h / | tail -1; echo; echo '===== LOOSE VOLUMES (not deleted - review only)'; for v in $(docker volume ls -qf dangling=true); do m=$(docker volume inspect -f '{{.Mountpoint}}' $v); echo VOLUME $v created $(docker volume inspect -f '{{.CreatedAt}}' $v) size $(du -sh $m | cut -f1); ls $m | head -5; echo; done; echo '===== /root (not deleted - review only)'; du -sh /root/* /root/.[!.]* 2>/dev/null | sort -h | tail -10; echo; echo '===== CLEANUP'; journalctl --vacuum-size=500M 2>&1 | tail -1; find /var/log -type f \( -name '*.gz' -o -name '*.[0-9]' \) -delete; echo rotated logs removed; docker image prune -a -f --filter until=168h | tail -1; echo; echo '===== AFTER'; df -h / | tail -1; docker system df" > server-cleanup.log
echo.
type server-cleanup.log
echo.
echo Finished. The result is saved in scripts\server-cleanup.log
pause
