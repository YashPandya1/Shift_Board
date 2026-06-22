@echo off
REM Use Node's bundled npm (10.x) - bypasses outdated Roaming npm 6.x
set NPM_CLI=C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js
set TARGET=%1
if "%TARGET%"=="" set TARGET=all

if /i "%TARGET%"=="backend" goto backend
if /i "%TARGET%"=="frontend" goto frontend
if /i "%TARGET%"=="all" goto all
echo Usage: install.cmd [backend^|frontend^|all]
exit /b 1

:backend
cd /d "%~dp0backend"
node "%NPM_CLI%" install
exit /b %ERRORLEVEL%

:frontend
cd /d "%~dp0frontend"
node "%NPM_CLI%" install --legacy-peer-deps
exit /b %ERRORLEVEL%

:all
call "%~f0" backend
call "%~f0" frontend
exit /b %ERRORLEVEL%
