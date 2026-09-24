@echo off
title MabsolCrm - Desktop Sync Worker
echo ========================================================
echo   MabsolCrm - Desktop Database Sync Worker
echo ========================================================
echo.
echo Starting background worker for live cloud database sync...
echo Local Folder: Watcher and Queue active
echo.

cd /d "%~dp0"

if exist "worker.cjs" (
    node worker.cjs
) else if exist "scripts\mabsolcrm-sync\worker.cjs" (
    node scripts\mabsolcrm-sync\worker.cjs
) else (
    echo.
    echo Downloading worker script from Cloud server...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://phcrm.mabsolinfotech.cloud/api/mabsolcrmsync/download-worker?file=worker.cjs', 'worker.cjs')"
    if exist "worker.cjs" (
        node worker.cjs
    ) else (
        echo ERROR: Could not find or download worker.cjs
    )
)

pause
