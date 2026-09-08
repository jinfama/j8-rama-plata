@echo off
rem ── Minerva · Historia del olivar — lanzador local ──
rem Sirve la carpeta por HTTP (necesario: los navegadores bloquean modulos ES6
rem y fetch de JSON cuando se abre el index con doble clic / file://) y abre el navegador.
cd /d "%~dp0"

set "PY=C:\Users\jinfa\AppData\Local\Programs\Python\Python312\python.exe"
if not exist "%PY%" set "PY=python"

echo Iniciando servidor local en http://127.0.0.1:8848 ...
start "Minerva (servidor)" "%PY%" -m http.server 8848
rem esperar a que levante el servidor y abrir el navegador
timeout /t 2 >nul
start "" "http://127.0.0.1:8848/index.html"

echo.
echo Minerva esta servido en:  http://127.0.0.1:8848/index.html
echo Cierra la ventana "Minerva (servidor)" para detenerlo.
echo.
pause
