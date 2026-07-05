@echo off
setlocal EnableDelayedExpansion
REM Stops the Apna Advisor server (whichever node.exe is holding port 3000).

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo Stopping PID %%p ...
    taskkill /PID %%p /F >nul 2>&1
)

echo Apna Advisor stopped.
timeout /t 2 >nul
exit /b 0
