@echo off
echo ====================================
echo   Poultry Farm Management System
echo   Quick Start
echo ====================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please follow these steps:
    echo 1. Go to https://nodejs.org
    echo 2. Download and install Node.js LTS version
    echo 3. Restart this script
    echo.
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

:: Check if package.json exists
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Make sure you are running this from the correct folder.
    pause
    exit /b 1
)

:: Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo Dependencies installed successfully!
    echo.
)

echo Choose an option:
echo.
echo 1. Run in development mode
echo 2. Build Windows executable
echo 3. Install/Update dependencies
echo 4. Exit
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto run_dev
if "%choice%"=="2" goto build_app
if "%choice%"=="3" goto install_deps
if "%choice%"=="4" goto exit
goto invalid_choice

:run_dev
echo.
echo Starting application in development mode...
npm start
goto end

:build_app
echo.
echo Building Windows executable...
npm run build-win
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo.
echo Build completed successfully!
echo Check the 'dist' folder for the executable files.
goto end

:install_deps
echo.
echo Installing/Updating dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed successfully!
goto end

:invalid_choice
echo.
echo Invalid choice. Please enter 1, 2, 3, or 4.
pause
goto end

:exit
echo.
echo Goodbye!
exit /b 0

:end
echo.
echo ====================================
echo   Operation completed
echo ====================================
pause
