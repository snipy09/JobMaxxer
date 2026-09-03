@echo off
title Hirestack - HR & Manager Email Scraper
color 0B
cd /d "%~dp0"
echo ========================================================================
echo  📬 HIRESTACK: Running Local HR & Manager Scraper & Supabase Publisher
echo ========================================================================
echo.
call npx tsx packages/scrapers/src/publish-hrs.ts
echo.
echo ========================================================================
echo  Press any key to exit...
echo ========================================================================
pause >nul
