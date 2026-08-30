@echo off
REM ===================================================================
REM  Build JobMaxxer.bat
REM  Double-click this to build JobMaxxer v2.0.0 and copy the .exe into
REM  your Downloads folder. Credentials are already baked into the
REM  PowerShell script, so there is nothing to type.
REM ===================================================================
cd /d "%~dp0"
echo Building JobMaxxer v2.0.0 - this can take several minutes on the first run...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-jobmaxxer.ps1"
echo.
echo ===================================================================
echo  Finished. Check your Downloads folder for:
echo    - JobMaxxer Setup 2.0.0.exe   (installer)
echo    - JobMaxxer 2.0.0.exe         (portable)
echo ===================================================================
pause
