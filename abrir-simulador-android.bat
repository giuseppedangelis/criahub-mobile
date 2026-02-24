@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
set "EMULATOR_EXE=%SDK_ROOT%\emulator\emulator.exe"
set "ADB_EXE=%SDK_ROOT%\platform-tools\adb.exe"
set "AVD_NAME=%~1"

if "%AVD_NAME%"=="" set "AVD_NAME=Pixel_8"

if not exist "%EMULATOR_EXE%" (
  echo [ERRO] Nao encontrei o emulator.exe em:
  echo %EMULATOR_EXE%
  exit /b 1
)

if not exist "%ADB_EXE%" (
  echo [ERRO] Nao encontrei o adb.exe em:
  echo %ADB_EXE%
  exit /b 1
)

set "EMULATOR_CONNECTED="
for /f "tokens=1,2" %%A in ('"%ADB_EXE%" devices ^| findstr /R "^emulator-[0-9][0-9]*[ ]*device"') do (
  set "EMULATOR_CONNECTED=1"
)

if not defined EMULATOR_CONNECTED (
  echo Iniciando emulador %AVD_NAME%...
  start "Android Emulator" "%EMULATOR_EXE%" -avd %AVD_NAME%
  echo Aguardando emulador conectar no ADB...
  "%ADB_EXE%" wait-for-device >nul 2>&1
) else (
  echo Emulador ja conectado. Reutilizando sessao atual.
)

echo Abrindo app no Android...
cd /d "%PROJECT_DIR%"
npx expo start --android --port 8082

endlocal
