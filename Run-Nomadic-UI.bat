@echo off
cd /d "%~dp0"
echo Starting Nomadic UI on http://localhost:5173 ...
npm run ui:dev
pause
