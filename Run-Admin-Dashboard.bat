@echo off
cd /d "C:\Users\sajal\projects\Hirestack"
echo ===================================================
echo   Hirestack Admin Dashboard (Localhost Control)
echo ===================================================
echo Opening Admin Dashboard in your browser: http://localhost:5173/?admin=true
echo Starting local Vite dev server...
start http://localhost:5173/?admin=true
call "C:\Program Files\nodejs\npm.cmd" run ui:dev
pause
