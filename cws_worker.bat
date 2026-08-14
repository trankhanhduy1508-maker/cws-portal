@echo off
REM =====================================================================
REM CWS Worker Launcher - file nay la LOP VO NGOAI, nguoi dung CHI CAN
REM double-click file .bat nay, KHONG can biet Python la gi.
REM
REM Ly do can file nay: may quan net thuong la may DISKLESS - chu quan
REM RESET may la MAT toan bo phan mem da cai (ke ca Python) sau moi lan
REM tat may (00_Principles.md 0.4). File .bat nay tu kiem tra va tu TAI
REM PYTHON EMBEDDABLE (ban portable chinh thuc tu python.org, khong can
REM quyen Admin de cai dat) NEU CHUA CO, giong y het cach cws_worker_full.py
REM da tu tai Blender portable - khong phu thuoc may da co san gi truoc do.
REM =====================================================================

setlocal enabledelayedexpansion

REM ----- CWS_DIR: DIA CHI RIENG CHO TUNG DOI TAC (KHONG PHAI hang so co
REM dinh cua kien truoc CWS) - sua theo phan bien cua Dy 22/07/2026: hard-
REM code cung 1 o dia cho moi doi tac la no ky thuat, vi doi tac khac co
REM the cau hinh BootROM/diskless voi o dia khac (E:\, H:\, M:\...).
REM
REM Ly do CAN mot o KHONG BI reset (du la o nao): may nay dung bootROM
REM (tinh than diskless, 00_Principles.md 0.4) - o he thong (C:) bi RESET
REM ve trang thai ban dau MOI LAN tat may, mat het moi thu da tai (Python,
REM Blender). Phai luu CWS_Render o mot o KHONG bi reset de khong phai tai
REM lai Python+Blender moi lan khoi dong may.
REM
REM KHI TRIEN KHAI CHO DOI TAC MOI: CHI CAN SUA DONG BEN DUOI (doi ten o
REM dia cho dung voi cau hinh BootROM cua doi tac do) - KHONG can sua bat
REM ky gi trong cws_worker_full.py, vi file .py doc lai CWS_DIR qua bien
REM moi truong (os.environ), Python HOAN TOAN KHONG biet/quan tam ten o
REM dia cu the la gi.
REM
REM Gia tri hien tai (G:\) la cau hinh THAT SU cua doi tac anh Thong,
REM xac nhan 22/07/2026 - KHONG PHAI mac dinh chung cho moi doi tac.
if "%CWS_DIR%"=="" set "CWS_DIR=G:\CWS_Render"
set "PYTHON_DIR=%CWS_DIR%\PythonEmbed"
set "PYTHON_EXE=%PYTHON_DIR%\python.exe"
set "PYTHON_VERSION=3.12.7"
set "PYTHON_ZIP_URL=https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-embed-amd64.zip"
set "GETPIP_URL=https://bootstrap.pypa.io/get-pip.py"
set "PYTHON_ZIP_SHA256=0D57BB6CB078B74D23DBFE91F77D6780D45BED328911609F1F7EE2BA1606BF44"
set "GETPIP_SHA256=FB24E693BAB954209A063D90953621412CCAD4A500905A726286E038F508DDF6"

REM ----- Cau hinh cho Self Recovery + Auto Update (dua theo condor_master
REM cua HTCondor: tien trinh cha DON GIAN, tu khoi dong lai neu con crash,
REM tu kiem tra ban moi truoc moi lan chay). Xem 10_setup_worker_selfheal.sql -----
set "SUPABASE_URL=https://ynhxlxetwuiyejcjypsi.supabase.co"
set "SUPABASE_KEY=sb_publishable_OyV65PRDgzukM36BNZnCdg_6T3-OeG1"
set "VERSION_FILE=%CWS_DIR%\worker_version.txt"
set "COOLDOWN_SEC=15"

REM ----- Credential B2 (BUCKET PRIVATE - can xin authorizationToken truoc
REM khi tai file, KHONG PHAI link tinh don gian. Dung KEY RIENG, chi
REM Read-Only, GIOI HAN prefix "worker-releases/" - KHONG dung chung key
REM chinh cua Worker (key do co quyen qua rong: doc/ghi toan bo bucket,
REM bao gom du lieu render cua khach hang). Key nay tao rieng 22/07/2026,
REM chi doc duoc dung thu muc worker-releases/, an toan de nhung vao .bat
REM phan phoi cho nhieu may ma khong lo lo du lieu khach hang) -----
set "B2_KEY_ID=00483fb516ab3b10000000002"
set "B2_APP_KEY=K00404F3uE/NN9Iq5o5rkUd5twmspK8"
set "B2_BUCKET_NAME=MTEB90"
set "B2_FILE_NAME=worker-releases/cws_worker_full.py"

if not exist "%CWS_DIR%" mkdir "%CWS_DIR%"

REM ----- Buoc 1: Kiem tra Python portable da co san chua -----
if exist "%PYTHON_EXE%" (
    echo [setup] Python portable da co san: %PYTHON_EXE%
    if /I "%~1"=="--bootstrap-only" goto :bootstrap_only
    goto :run_worker
)

echo [setup] Chua co Python, dang tu dong tai ban portable %PYTHON_VERSION%...
if not exist "%PYTHON_DIR%" mkdir "%PYTHON_DIR%"

REM ----- Buoc 2: Tai va kiem tra hash Python Embeddable -----
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ProgressPreference='SilentlyContinue'; try { Invoke-WebRequest -UseBasicParsing -Uri '%PYTHON_ZIP_URL%' -OutFile '%PYTHON_DIR%\python_embed.zip'; $h=(Get-FileHash -LiteralPath '%PYTHON_DIR%\python_embed.zip' -Algorithm SHA256).Hash; if($h -ne '%PYTHON_ZIP_SHA256%'){Remove-Item -LiteralPath '%PYTHON_DIR%\python_embed.zip' -Force -ErrorAction SilentlyContinue; exit 42} } catch { exit 1 }"
if errorlevel 42 (
    echo [LOI] Hash Python khong khop, da xoa artifact khong hop le.
    pause
    exit /b 1
)
if not exist "%PYTHON_DIR%\python_embed.zip" (
    echo [LOI] Tai Python that bai. Kiem tra ket noi mang roi thu lai.
    pause
    exit /b 1
)

REM ----- Buoc 3: Giai nen (dung tinh nang tar co san tren Windows 10/11) -----
echo [setup] Dang giai nen...
tar -xf "%PYTHON_DIR%\python_embed.zip" -C "%PYTHON_DIR%"
del "%PYTHON_DIR%\python_embed.zip"
if not exist "%PYTHON_EXE%" (
    echo [LOI] Python archive khong tao ra python.exe.
    pause
    exit /b 1
)
"%PYTHON_EXE%" --version
if errorlevel 1 (
    echo [LOI] Python portable khong chay duoc sau khi giai nen.
    pause
    exit /b 1
)

REM ----- Buoc 4: Bat lai pip (ban Embeddable mac dinh TAT tim module ngoai
REM qua file ._pth - PHAI sua file nay, neu khong "pip install" se khong
REM hoat dong duoc du co goi get-pip.py) -----
echo [setup] Dang cau hinh de bat pip...
for %%f in ("%PYTHON_DIR%\python*._pth") do (
    powershell -Command "(Get-Content '%%f') -replace '^#import site', 'import site' | Set-Content '%%f'"
)

REM ----- Buoc 4b: Tao thu muc DLLs neu chua co - ban Embeddable doi khi
REM thieu thu muc nay, gay loi "FileNotFoundError: [WinError 3]... DLLs"
REM khi chay get-pip.py hoac import mot so module chuan (da xac nhan qua
REM nhieu bao cao loi thuc te khi setup Python Embeddable) -----
if not exist "%PYTHON_DIR%\DLLs" mkdir "%PYTHON_DIR%\DLLs"

REM ----- Buoc 5: Tai, kiem tra hash va chay get-pip.py -----
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ProgressPreference='SilentlyContinue'; try { Invoke-WebRequest -UseBasicParsing -Uri '%GETPIP_URL%' -OutFile '%PYTHON_DIR%\get-pip.py'; $h=(Get-FileHash -LiteralPath '%PYTHON_DIR%\get-pip.py' -Algorithm SHA256).Hash; if($h -ne '%GETPIP_SHA256%'){Remove-Item -LiteralPath '%PYTHON_DIR%\get-pip.py' -Force -ErrorAction SilentlyContinue; exit 42} } catch { exit 1 }"
if errorlevel 42 (
    echo [LOI] Hash get-pip.py khong khop, da xoa artifact khong hop le.
    pause
    exit /b 1
)
if not exist "%PYTHON_DIR%\get-pip.py" (
    echo [LOI] Tai get-pip.py that bai.
    pause
    exit /b 1
)
"%PYTHON_EXE%" "%PYTHON_DIR%\get-pip.py" --quiet
if errorlevel 1 (
    echo [LOI] Cai pip that bai.
    del "%PYTHON_DIR%\get-pip.py"
    pause
    exit /b 1
)
del "%PYTHON_DIR%\get-pip.py"

echo [setup] Da cai xong Python portable + pip tai: %PYTHON_DIR%
if /I "%~1"=="--bootstrap-only" goto :bootstrap_only

:run_worker
REM =====================================================================
REM VONG LAP GIAM SAT (Self Recovery + Auto Update) - dua theo condor_master.
REM File .bat nay CO Y giu that DON GIAN (chi goi curl + so sanh chuoi text),
REM KHONG duoc them logic phuc tap vao day - logic that nam het trong file
REM .py. Neu ban than file .bat nay loi thi khong con gi tu phuc hoi duoc,
REM giong dung nguyen tac HTCondor: "master duoc giu don gian toi da de
REM giam kha nang chinh no bi crash".
REM =====================================================================

:check_update
REM ----- Kiem tra ban moi nhat tren Supabase, so sanh voi ban dang co -----
if not exist "%VERSION_FILE%" echo 0.0.0 > "%VERSION_FILE%"
set /p CURRENT_VERSION=<"%VERSION_FILE%"

curl -s -o "%TEMP%\cws_version_check.json" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  "%SUPABASE_URL%/rest/v1/worker_config?component=eq.worker_full_py&select=latest_version,download_url"

REM Doc gia tri bang PowerShell (co san tren Windows 10/11, khong can cai them)
REM - neu buoc nay loi (vd mat mang luc kiem tra) thi BO QUA auto-update,
REM chay tiep ban hien co, KHONG duoc chan worker khoi hoat dong chi vi
REM khong kiem tra duoc ban moi.
set "LATEST_VERSION="
set "DOWNLOAD_URL="
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command ^
  "try { $j = Get-Content '%TEMP%\cws_version_check.json' -Raw | ConvertFrom-Json; if ($j.Count -gt 0) { $j[0].latest_version } } catch {}"`) do set "LATEST_VERSION=%%v"
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command ^
  "try { $j = Get-Content '%TEMP%\cws_version_check.json' -Raw | ConvertFrom-Json; if ($j.Count -gt 0) { $j[0].download_url } } catch {}"`) do set "DOWNLOAD_URL=%%v"

if "%LATEST_VERSION%"=="" (
    echo [update] Khong kiem tra duoc ban moi ^(co the mat mang^), dung ban hien co.
    goto :launch_python
)

if "%LATEST_VERSION%"=="%CURRENT_VERSION%" (
    echo [update] Dang dung ban moi nhat: %CURRENT_VERSION%
    goto :launch_python
)

echo [update] Phat hien ban moi: %CURRENT_VERSION% -^> %LATEST_VERSION%, dang tai ve tu B2...

REM ----- Buoc A: Xin authorizationToken tu B2 (bucket dang PRIVATE, khong
REM the tai bang link tinh don gian nhu bucket public - can xac thuc truoc) -----
curl -s -u "%B2_KEY_ID%:%B2_APP_KEY%" ^
  "https://api.backblazeb2.com/b2api/v3/b2_authorize_account" ^
  -o "%TEMP%\cws_b2_auth.json"

set "B2_TOKEN="
set "B2_DOWNLOAD_URL="
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command ^
  "try { $j = Get-Content '%TEMP%\cws_b2_auth.json' -Raw | ConvertFrom-Json; $j.authorizationToken } catch {}"`) do set "B2_TOKEN=%%v"
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command ^
  "try { $j = Get-Content '%TEMP%\cws_b2_auth.json' -Raw | ConvertFrom-Json; $j.apiInfo.storageApi.downloadUrl } catch {}"`) do set "B2_DOWNLOAD_URL=%%v"

if "%B2_TOKEN%"=="" (
    echo [update] Khong xin duoc quyen truy cap B2 ^(co the mat mang^), tam dung ban hien co.
    goto :launch_python
)

REM ----- Buoc B: Dung token vua xin de tai file that (bucket private
REM CAN header Authorization, khac hoan toan link tinh cua bucket public) -----
curl -s -o "%~dp0cws_worker_full.py.new" ^
  -H "Authorization: %B2_TOKEN%" ^
  "%B2_DOWNLOAD_URL%/file/%B2_BUCKET_NAME%/%B2_FILE_NAME%"

if exist "%~dp0cws_worker_full.py.new" (
    move /y "%~dp0cws_worker_full.py.new" "%~dp0cws_worker_full.py" >nul
    echo %LATEST_VERSION% > "%VERSION_FILE%"
    echo [update] Da cap nhat xong len ban %LATEST_VERSION%.
) else (
    echo [update] Tai ban moi that bai, tam dung ban hien co %CURRENT_VERSION%.
)

:launch_python
echo =====================================================================
echo Dang khoi dong CWS Worker...
echo =====================================================================

REM Dung DUNG duong dan python.exe portable vua chuan bi, khong dua vao
REM PATH he thong (may co the khong co Python trong PATH, hoac co ban
REM Python khac khong tuong thich)
"%PYTHON_EXE%" "%~dp0cws_worker_full.py"

REM ----- Neu chay den day nghia la Python DA THOAT (du crash hay Ctrl+C) -----
echo.
echo [supervisor] Worker da thoat. Doi %COOLDOWN_SEC%s truoc khi tu khoi dong lai...
echo [supervisor] Nhan Ctrl+C ngay bay gio neu muon dung han.
timeout /t %COOLDOWN_SEC% /nobreak >nul 2>nul
goto :check_update

:bootstrap_only
echo =====================================================================
echo CWS bootstrap-only: chi kiem tra Python packages va Blender portable.
"%PYTHON_EXE%" "%~dp0cws_worker_full.py" --bootstrap-only
if errorlevel 1 (
    echo [LOI] Bootstrap-only that bai.
    pause
    exit /b 1
)
echo [setup] Bootstrap-only PASS. Khong chay Worker, Supabase, B2 hoac Blender render.
exit /b 0
