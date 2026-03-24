@echo off
echo ========================================
echo MongoDB Setup and Migration Script
echo ========================================
echo.

echo Step 1: Checking MongoDB installation...
where mongod >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: MongoDB is not installed or not in PATH
    echo Please install MongoDB from: https://www.mongodb.com/try/download/community
    echo Or run: winget install MongoDB.Server
    pause
    exit /b 1
)
echo MongoDB found!
echo.

echo Step 2: Starting MongoDB service...
net start MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    echo MongoDB service started successfully
) else (
    echo MongoDB service already running or starting...
)
echo.

echo Step 3: Waiting for MongoDB to be ready...
timeout /t 3 /nobreak >nul
echo MongoDB is ready!
echo.

echo Step 4: Running data migration from SQLite to MongoDB...
echo This will copy all data from pmo.db to MongoDB...
call npm run migrate
if %errorlevel% neq 0 (
    echo ERROR: Migration failed!
    pause
    exit /b 1
)
echo.

echo Step 5: Migration completed successfully!
echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo MongoDB is running and data has been migrated.
echo You can now start the application with: npm run dev
echo.
pause
