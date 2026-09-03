@echo off
REM ===================================================================
REM  Build JobMaxxer.bat
REM  Double-click this to build JobMaxxer v2.0.0 and copy the .exe into
REM  your Downloads folder. Credentials are already baked into the
REM  PowerShell script, so there is nothing to type.
REM ===================================================================
cd /d "%~dp0"
echo Building Nomadic v1.0.0 - this can take several minutes on the first run...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-nomadic.ps1"
echo.
echo ===================================================================
echo  Finished. Check your Downloads folder for:
echo    - Nomadic Setup 1.0.0.exe   (installer)
echo    - Nomadic 1.0.0.exe         (portable)
echo ===================================================================
pause
