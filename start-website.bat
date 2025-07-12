@echo off
echo ====================================
echo   Poultry Farm Management Website
echo   Website Launcher
echo ====================================
echo.

echo Opening the Poultry Farm Management Website...
echo.

:: Open the main website
start "" "website.html"

echo.
echo The website should now be open in your default browser.
echo.
echo Available pages:
echo - Main Website: website.html
echo - Farm System: poultry-farm-system.html
echo - Offline Page: offline.html
echo.
echo For development:
echo - Use a local server for full functionality
echo - Example: python -m http.server 8000
echo - Then visit: http://localhost:8000
echo.

pause
