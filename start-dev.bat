@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo.
echo ==========================================
echo  E-Learning LMS Development Environment
echo ==========================================
echo.

REM Step 0: Aggressive cleanup
echo [CLEANUP] Aggressive cleanup...
echo   Stopping all containers...
for /f "tokens=*" %%A in ('docker ps -aq 2^>nul') do (
    docker stop %%A >nul 2>&1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2"

echo   Removing old containers...
docker rm mongo_lms 2>nul
docker rm redis_lms 2>nul
docker rm oracle_lms 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1"

echo   Resetting Docker compose...
cd /d "%~dp0backend"
call npm run docker:reset 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 5"

REM Step 1: Start Docker containers
echo [DOCKER] Step 1: Starting Docker containers...
call npm run docker:up
if errorlevel 1 (
    echo ERROR: docker:up failed
    cd /d "%~dp0"
    pause
    exit /b 1
)

REM Go back to root for seeding
cd /d "%~dp0"

echo.
echo Waiting for Oracle XEPDB1 listener to accept SQL connections...
set ORACLE_READY=0
for /l %%I in (1,1,60) do (
    docker exec oracle_lms sh -c "echo 'select 1 from dual;' | sqlplus -L -S your_oracle_user/123456@//localhost:1521/XEPDB1" >nul 2>&1
    if not errorlevel 1 (
        set ORACLE_READY=1
        goto ORACLE_READY
    )
    echo   Oracle XEPDB1 is not ready yet - attempt %%I of 60...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 5" >nul 2>&1
)

:ORACLE_READY
if not "!ORACLE_READY!"=="1" (
    echo ERROR: Oracle XEPDB1 was not ready after 300 seconds.
    echo Last Oracle logs:
    docker logs --tail 80 oracle_lms
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo Oracle XEPDB1 is ready.

echo.
echo [DOCKER] Checking container status...
docker ps | findstr "mongo_lms redis_lms oracle_lms"

REM Step 2: Seed Oracle Database
echo.
echo [ORACLE] Step 2: Seeding Oracle Database...

echo.
echo Copying SQL files to container...
docker cp backend\src\modules\identity\infrastructure\scripts\init.sql    oracle_lms:/tmp/identity_init.sql
docker cp backend\src\modules\identity\infrastructure\scripts\seed.sql    oracle_lms:/tmp/identity_seed.sql
docker cp backend\src\modules\academic\infrastructure\scripts\init.sql    oracle_lms:/tmp/academic_init.sql
docker cp backend\src\modules\academic\infrastructure\scripts\seed.sql    oracle_lms:/tmp/academic_seed.sql
docker cp backend\src\modules\analytic\infrastructure\scripts\init.sql    oracle_lms:/tmp/analytic_init.sql

echo.
echo Running SQL scripts...
docker exec -i oracle_lms sqlplus -L "your_oracle_user/123456@//localhost:1521/XEPDB1" "@/tmp/identity_init.sql"
if errorlevel 1 (
    echo ERROR: identity_init.sql failed
    cd /d "%~dp0"
    pause
    exit /b 1
)
docker exec -i oracle_lms sqlplus -L "your_oracle_user/123456@//localhost:1521/XEPDB1" "@/tmp/identity_seed.sql"
if errorlevel 1 (
    echo ERROR: identity_seed.sql failed
    cd /d "%~dp0"
    pause
    exit /b 1
)
docker exec -i oracle_lms sqlplus -L "your_oracle_user/123456@//localhost:1521/XEPDB1" "@/tmp/academic_init.sql"
if errorlevel 1 (
    echo ERROR: academic_init.sql failed
    cd /d "%~dp0"
    pause
    exit /b 1
)
docker exec -i oracle_lms sqlplus -L "your_oracle_user/123456@//localhost:1521/XEPDB1" "@/tmp/academic_seed.sql"
if errorlevel 1 (
    echo ERROR: academic_seed.sql failed
    cd /d "%~dp0"
    pause
    exit /b 1
)
docker exec -i oracle_lms sqlplus -L "your_oracle_user/123456@//localhost:1521/XEPDB1" "@/tmp/analytic_init.sql"
if errorlevel 1 (
    echo ERROR: analytic_init.sql failed
    cd /d "%~dp0"
    pause
    exit /b 1
)

echo.
echo Oracle database seeded!

REM Step 3: Kill old processes and start backend
echo.
echo [BACKEND] Step 3: Starting Backend (port 3000)...
taskkill /F /IM node.exe 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1"

cd /d "%~dp0backend"

echo Building backend...
call npm run build >nul 2>&1
if errorlevel 1 (
    echo ERROR: Backend build failed
    call npm run build
    cd /d "%~dp0"
    pause
    exit /b 1
)

echo Backend built - starting dev server in new window...
start "E-Learning Backend" cmd /k "npm run dev"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 5"

REM Step 4: Start frontend
echo.
echo [FRONTEND] Step 4: Starting Frontend (port 5173)...
cd /d "%~dp0frontend"

echo Installing dependencies...
call npm install >nul 2>&1

echo Starting dev server in new window...
start "E-Learning Frontend" cmd /k "npm run dev"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 3"

echo.
echo ==========================================
echo  Development Environment Ready!
echo ==========================================
echo.
echo Services:
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:3000
echo   Swagger:   http://localhost:3000/api-docs/
echo   OpenAPI:   http://localhost:3000/openapi.json
echo   MongoDB:   localhost:27017
echo   Redis:     localhost:6379
echo   Oracle:    localhost:1521
echo.
echo Test Data:
echo   Admin:    admin@school.edu.vn / Admin@123
echo   Teacher:  nguyen.van.an@school.edu.vn / Teacher@123
echo   Student:  sv001@student.school.edu.vn / Student@123
echo.
echo New windows have opened for Backend and Frontend.
echo.

cd /d "%~dp0"
pause
