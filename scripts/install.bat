@echo off
title LinkedIn Auto Apply — Installing...
cls
echo ============================================
echo    LinkedIn Auto Apply — Installing...
echo ============================================
echo.

set INSTALL_DIR=%USERPROFILE%\linkedin-auto-apply

:: --- Check for Node.js ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo >> Node.js not found. Installing...
    echo >> Downloading Node.js installer...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.15.0/node-v22.15.0-x64.msi' -OutFile '%TEMP%\node-installer.msi'"
    echo >> Running Node.js installer...
    msiexec /i "%TEMP%\node-installer.msi" /qn
    del "%TEMP%\node-installer.msi"
    :: Refresh PATH
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

:: --- Check for Git ---
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo >> Git not found. Installing...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe' -OutFile '%TEMP%\git-installer.exe'"
    echo >> Running Git installer...
    "%TEMP%\git-installer.exe" /VERYSILENT /NORESTART
    del "%TEMP%\git-installer.exe"
    set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
)

:: --- Clone or update ---
if exist "%INSTALL_DIR%" (
    echo >> Updating existing installation...
    cd /d "%INSTALL_DIR%"
    git pull --ff-only
) else (
    echo >> Downloading app...
    git clone https://github.com/jtur671/linkedin-auto-apply.git "%INSTALL_DIR%"
    cd /d "%INSTALL_DIR%"
)

:: --- Install dependencies ---
echo >> Installing dependencies...
call npm install --no-fund --no-audit

:: --- Set up database ---
echo >> Setting up database...
call npx prisma generate --no-hints
call npx prisma db push --skip-generate

echo.
echo ============================================
echo    Done! Opening app in your browser...
echo ============================================
echo.
echo   Keep this window open while using the app.
echo   Press Ctrl+C to stop.
echo.

:: --- Start app and open browser ---
start "" http://localhost:3000
timeout /t 2 >nul
call npm run dev
