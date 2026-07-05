@echo off
setlocal EnableDelayedExpansion
REM Run from the project root (this file lives in .\launcher\)
cd /d "%~dp0.."

REM ============================================================
REM  Apna Advisor launcher (internal)
REM  Called by "Start Apna Advisor.vbs" at the project root.
REM  If the server is already running, just opens the browser.
REM  Otherwise starts it hidden, waits for it, then opens the browser.
REM ============================================================

REM --- 1. If port 3000 is already listening, just open the browser ---
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if !errorlevel! equ 0 (
    start "" "http://localhost:3000"
    exit /b 0
)

REM --- 2. Ensure production build exists (first-run safety net) ---
if not exist ".next\BUILD_ID" (
    echo First-time setup: building Apna Advisor...
    call npm run build
    if errorlevel 1 (
        echo Build failed. Press any key to close.
        pause >nul
        exit /b 1
    )
)

REM --- 3. Start the Next.js server fully hidden ---
powershell -NoProfile -WindowStyle Hidden -Command ^
  "Start-Process -FilePath cmd -WindowStyle Hidden -WorkingDirectory '%CD%' -ArgumentList '/c','npm run start > server.log 2>&1'"

REM --- 4. Wait for the server to accept connections (up to ~30s) ---
set /a tries=0
:wait
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if !errorlevel! equ 0 goto ready
set /a tries+=1
if !tries! lss 30 goto wait

:ready
REM --- 5. Open the browser ---
start "" "http://localhost:3000"
exit /b 0
