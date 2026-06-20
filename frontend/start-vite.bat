@echo off
cd /d "%~dp0"
call npm.cmd run dev -- --host 0.0.0.0 --port 3001
