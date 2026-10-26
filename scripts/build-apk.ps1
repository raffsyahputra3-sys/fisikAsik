# Membangun APK debug memakai JDK dan Android SDK di D:\android-build.
# Pakai:  powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$env:JAVA_HOME = "D:\android-build\jdk\jdk-21.0.12.1+1"
$env:ANDROID_HOME = "D:\android-build\sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

Set-Location $root
node scripts/build-www.mjs
npx cap sync android

Set-Location "$root\android"
Set-Content -Path local.properties -Value "sdk.dir=D:/android-build/sdk" -Encoding ascii
cmd /c ".\gradlew.bat assembleDebug --no-daemon"
if ($LASTEXITCODE -ne 0) { throw "Build gagal (exit $LASTEXITCODE)" }

New-Item -ItemType Directory -Force "$root\dist" | Out-Null
Copy-Item "$root\android\app\build\outputs\apk\debug\app-debug.apk" "$root\dist\Logicodix-debug.apk" -Force
Write-Host "APK siap: $root\dist\Logicodix-debug.apk"
