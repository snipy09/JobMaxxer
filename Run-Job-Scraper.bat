@echo off
title Nomadic - Job Radar Scraper
color 0A
cd /d "%~dp0"
echo ========================================================================
echo  ⚡ NOMADIC: Running Local Job Scraper & Supabase Publisher
echo ========================================================================
echo.
call npx tsx packages/scrapers/src/publish-jobs.ts
echo.
echo ========================================================================
echo  Press any key to exit...
echo ========================================================================
pause >nul
