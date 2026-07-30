@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM CWS - Auto Ghep Video (Khau 8, plugin doc lap, THUAN CMD)
REM ============================================================
REM Tu dong hoa Khau 8: tra Supabase (dang CSV, KHONG dung PowerShell,
REM KHONG tu parse JSON phuc tap) lay frame_start/end/fps that + xac
REM nhan job da render xong 100%%, tai PNG tu B2, gop file, DEM XAC
REM NHAN DU FRAME truoc khi ghep, chi ghep khi du.
REM
REM CACH DUNG: double-click, nhap Job ID khi duoc hoi (vd CWS-JOB4-PHONG10)
REM TU CHUA config (B2 key, Supabase key) - chay tren may Windows
REM bat ky co: curl (co san tu Win10), aws cli, ffmpeg.
REM
REM DE XOA: xoa file nay. Chi doc RPC rieng (get_job_render_summary),
REM khong dung chung gi voi worker chinh, khong ghi/sua du lieu nao.
REM ============================================================

set SUPABASE_URL=https://ynhxlxetwuiyejcjypsi.supabase.co
set SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluaHhseGV0d3VpeWVqY2p5cHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MDAxNjAsImV4cCI6MjEwMDE3NjE2MH0.9xFRvMGQpx0kYzHZCtqRlTuYx8bp3jI3P5-L6cVRXDE
set B2_BUCKET=MTEB90
set B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
set FFMPEG_PATH=C:\ffmpeg\ffmpeg-8.1.2-essentials_build\bin\ffmpeg.exe
set OUTPUT_DIR=C:\render_output

echo ============================================
echo CWS - Auto Ghep Video
echo ============================================
echo.

set /p JOB_ID="Nhap Job ID (vd: CWS-JOB4-PHONG10): "
if "%JOB_ID%"=="" (
    echo LOI: Chua nhap Job ID. Thoat.
    pause
    exit /b 1
)

echo.
echo Dang tra cuu Job "%JOB_ID%" tren Supabase (dang CSV)...
echo.

REM ---- Goi RPC, yeu cau tra ve CSV (khong phai JSON) - de tach bang CMD don gian ----
curl -s -X POST "%SUPABASE_URL%/rest/v1/rpc/get_job_render_summary" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -H "Accept: text/csv" ^
  -d "{\"p_job_id\": \"%JOB_ID%\"}" > "%TEMP%\cws_job_summary.csv"

echo Ket qua tra cuu (dang CSV):
type "%TEMP%\cws_job_summary.csv"
echo.
echo.

REM ---- Dong 1 la header (ten cot), dong 2 la du lieu that. Neu chi co 1 dong -> job khong ton tai ----
set LINE_COUNT=0
for /f %%L in ('type "%TEMP%\cws_job_summary.csv"') do set /a LINE_COUNT+=1

REM Doc header (dong 1) va data (dong 2) rieng biet
set "HEADER_LINE="
set "DATA_LINE="
set /a CUR_LINE=0
for /f "delims=" %%L in ('type "%TEMP%\cws_job_summary.csv"') do (
    set /a CUR_LINE+=1
    if !CUR_LINE! EQU 1 set "HEADER_LINE=%%L"
    if !CUR_LINE! EQU 2 set "DATA_LINE=%%L"
)

if not defined DATA_LINE (
    echo LOI: Job "%JOB_ID%" khong ton tai tren Supabase, hoac loi ket noi mang.
    echo Header nhan duoc: %HEADER_LINE%
    pause
    exit /b 1
)

REM Cot theo dung thu tu function tra ve:
REM job_id,total_frames,fps,frame_start_actual,frame_end_actual,done_tasks,active_tasks,queued_tasks,failed_tasks,is_fully_done
for /f "tokens=1-10 delims=," %%A in ("%DATA_LINE%") do (
    set "COL_JOB_ID=%%A"
    set "COL_TOTAL_FRAMES=%%B"
    set "COL_FPS=%%C"
    set "COL_FRAME_START=%%D"
    set "COL_FRAME_END=%%E"
    set "COL_DONE=%%F"
    set "COL_ACTIVE=%%G"
    set "COL_QUEUED=%%H"
    set "COL_FAILED=%%I"
    set "COL_IS_DONE=%%J"
)

echo Da doc duoc:
echo   Frame bat dau: %COL_FRAME_START%
echo   Frame ket thuc: %COL_FRAME_END%
echo   Tong frame can co: %COL_TOTAL_FRAMES%
echo   FPS: %COL_FPS%
echo   Dang active: %COL_ACTIVE% ^| Dang queued: %COL_QUEUED%
echo   Da render xong 100%%: %COL_IS_DONE%
echo.

if /i not "%COL_IS_DONE%"=="true" (
    echo ==================================================
    echo DUNG LAI: Job "%JOB_ID%" CHUA RENDER XONG 100%%.
    echo Con dang active: %COL_ACTIVE% task ^| dang cho hang doi: %COL_QUEUED% task.
    echo KHONG the ghep video khi chua render xong het.
    echo ==================================================
    pause
    exit /b 1
)

echo Job da xac nhan render xong 100%% tren Supabase. Tiep tuc...
echo.

set RAW_DIR=%OUTPUT_DIR%\%JOB_ID%_raw
set FLAT_DIR=%OUTPUT_DIR%\%JOB_ID%_flat
set OUTPUT_MP4=%OUTPUT_DIR%\%JOB_ID%.mp4

echo ---- Tai PNG tu B2 (sync, tu dong tiep tuc neu dang do) ----
aws s3 sync s3://%B2_BUCKET%/renders/%JOB_ID%/ "%RAW_DIR%\" --endpoint-url %B2_ENDPOINT%

if not exist "%RAW_DIR%" (
    echo LOI: Thu muc raw khong duoc tao. Kiem tra lai ket noi B2/aws cli.
    pause
    exit /b 1
)

echo.
echo ---- Gop PNG ve 1 thu muc phang ----
if not exist "%FLAT_DIR%" mkdir "%FLAT_DIR%"
for /r "%RAW_DIR%" %%f in (*.png) do copy "%%f" "%FLAT_DIR%\" >nul

echo.
echo ---- DEM XAC NHAN DU FRAME (buoc bat buoc, khong bo qua) ----
set COUNT=0
for %%f in ("%FLAT_DIR%\*.png") do set /a COUNT+=1

echo Da dem duoc: %COUNT% file PNG. Can du: %COL_TOTAL_FRAMES% file.
echo.

if not "%COUNT%"=="%COL_TOTAL_FRAMES%" (
    echo ==================================================
    echo DUNG LAI: SO FILE KHONG KHOP ^(%COUNT%/%COL_TOTAL_FRAMES%^).
    echo KHONG ghep video de tranh video thieu frame/sai.
    echo Kiem tra Caps ^& Alerts tren Backblaze, chay lai file nay sau.
    echo ==================================================
    pause
    exit /b 1
)

echo Du frame - AN TOAN DE GHEP.
echo.

echo ---- Ghep video bang ffmpeg ----
"%FFMPEG_PATH%" -framerate %COL_FPS% -start_number %COL_FRAME_START% -i "%FLAT_DIR%\frame_%%04d.png" -c:v libx264 -pix_fmt yuv420p -crf 18 "%OUTPUT_MP4%"

if exist "%OUTPUT_MP4%" (
    echo.
    echo ==================================================
    echo THANH CONG: Video da tao tai %OUTPUT_MP4%
    echo ==================================================
) else (
    echo.
    echo LOI: ffmpeg khong tao duoc file output. Xem log phia tren.
)

pause
