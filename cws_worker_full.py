"""
CWS Worker - BAN DAY DU: Blender that + B2 that + Supabase that
Theo dung nguyen tac da chot trong CWS_MEMORY.md / 01_Scheduler_Core.md:
- Blender portable, tu tai neu chua co, CACHE lai (khong tai lai moi lan)
- Google Drive download dung cong thuc confirm=t (2 buoc, da kiem chung)
- Kiem tra ket qua RENDER THAT (file PNG ton tai), khong tin dong "Saved:"
- Upload ket qua len B2 vao renders/{job_id}/task_{task_id}/
- Goi complete_task SAU KHI upload B2 thanh cong (khong phai ngay sau render)
- Result Validation: kiem tra anh khong den/trang/corrupt truoc khi upload

QUAN TRONG: file nay TU DONG cai moi thu vien Python can thiet (requests,
boto3, Pillow) ngay khi chay - KHONG can Dy/doi tac tu go pip install tay.
Ly do: may quan net thuong la may diskless, chu quan RESET may la MAT toan
bo thu vien da cai truoc do (00_Principles.md 0.4) - script phai TU PHUC
HOI moi lan chay, khong duoc gia dinh moi truong da san sang tu lan truoc.

Cach chay (chi can Python cai san, moi thu con lai TU DONG):
    python cws_worker_full.py
"""

import subprocess
import sys


def ensure_package_installed(import_name, pip_name=None):
    """Tu dong kiem tra + cai 1 thu vien Python neu chua co. Dung cho ca
    3 thu vien can thiet (requests, boto3, Pillow) - KHONG de nguoi dung
    phai nho chay pip install tay, vi may quan net diskless se MAT moi thu
    da cai sau khi chu quan reset may. Giong tinh than tu phuc hoi da ap
    dung cho Blender (ensure_blender_installed)."""
    pip_name = pip_name or import_name
    try:
        __import__(import_name)
    except ImportError:
        print(f"[setup] Chua co thu vien '{pip_name}', dang tu dong cai...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", pip_name, "--quiet"],
            check=True
        )
        print(f"[setup] Da cai xong '{pip_name}'.")


# Tu dong cai ca 3 thu vien TRUOC KHI import - phai lam o day, truoc moi
# dong code khac, vi cac module ben duoi (requests/boto3/PIL) can duoc cai
# xong thi cau lenh "import" o duoi moi chay duoc.
ensure_package_installed("requests")
ensure_package_installed("boto3")
ensure_package_installed("PIL", pip_name="Pillow")

import requests
import boto3
from botocore.client import Config
from PIL import Image
import zipfile
import os
import re
import json
import time
import threading
import uuid
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ===== SUPABASE =====
SUPABASE_URL = os.environ.get("CWS_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("CWS_SUPABASE_KEY") or os.environ.get("SUPABASE_KEY")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# ===== BACKBLAZE B2 =====
B2_KEY_ID = os.environ.get("CWS_B2_KEY_ID")
B2_APP_KEY = os.environ.get("CWS_B2_APP_KEY")
B2_ENDPOINT = os.environ.get("CWS_B2_ENDPOINT")
B2_BUCKET = os.environ.get("CWS_B2_BUCKET")

if not all((SUPABASE_URL, SUPABASE_KEY, B2_KEY_ID, B2_APP_KEY, B2_ENDPOINT, B2_BUCKET)):
    raise RuntimeError("legacy worker requires Supabase/B2 configuration from environment; no secret fallback exists")

# ===== BLENDER =====
BLENDER_VERSION = "5.2.0"
BLENDER_ZIP_URL = f"https://download.blender.org/release/Blender5.2/blender-{BLENDER_VERSION}-windows-x64.zip"
# ----- BASE_DIR: DOC TU BIEN MOI TRUONG CWS_DIR (KHONG con hard-code o
# dia cu the nua) - sua theo phan bien cua Dy 22/07/2026: hard-code G:\
# la no ky thuat, chi dung tam cho 1 doi tac (anh Thong). Cac doi tac
# khac co the dung o dia khac (E:\, H:\, M:\...) tuy cach ho cau hinh
# BootROM/diskless. cws_worker.bat da "set CWS_DIR=..." TRUOC KHI goi
# python.exe - CMD tu dong ke thua bien moi truong nay cho tien trinh
# con (python.exe), nen Python CHI CAN doc os.environ, KHONG can sua gi
# them o phia .bat.
#
# Fallback "G:/CWS_Render" CHI dung khi worker duoc chay TRUC TIEP bang
# tay (vd python cws_worker_full.py, khong qua .bat) - truong hop nay
# hiem, chu yeu de test/debug cua Dy, KHONG PHAI duong dan chinh thuc
# cho doi tac.
BASE_DIR = Path(os.environ.get("CWS_DIR", "G:/CWS_Render"))
BLENDER_DIR = BASE_DIR / "Blender"
BLENDER_EXE = BLENDER_DIR / f"blender-{BLENDER_VERSION}-windows-x64" / "blender.exe"
WORK_DIR = BASE_DIR / "work"

# ===== WORKER CONFIG =====
# CAP NHAT 25/07/2026: chuyen tu CWS-JOB2 (Goros Lair) sang CWS-JOB3 (Rui
# Huang - Titan Station.blend, 500 frame) - job MOI HOAN TOAN tren
# Supabase, KHONG lien quan CWS-CHUNKLIVE (Titan Station cu, da bo qua
# theo quyet dinh cua Dy 25/07/2026: lam lai tu dau, khong tiep tuc job cu).
JOB_ID = "CWS-JOB3"

# ----- JOB 4 (them 25/07/2026): 6 file .blend RIENG BIET (PhongNguRender5-10),
# khac Job 3 (chi 1 file). Worker se THU CLAIM lan luot qua danh sach nay,
# XAO TRON THU TU moi lan (theo quyet dinh Dy 25/07/2026: tranh 7 may cung
# don vao 1 job truoc, de lai cac job khac dung yen khong ai render).
#
# UU TIEN CUNG (them 25/07/2026, theo yeu cau khach - Dy xac nhan): PHONG5
# va PHONG6 phai duoc claim TRUOC, CHI khi CA 2 job nay het task 'queued'
# HOAN TOAN (khong con task nao de claim - claim_task tra ve None cho ca 2)
# thi worker moi duoc thu sang PHONG7-10. Day la uu tien CUNG, khac voi uu
# tien "mem" (chi thu truoc nhung van cho phep song song neu job kia con
# task active o may khac) - Dy da xac nhan chon ban CUNG.
#
# CAP NHAT 25/07/2026 (lan 2, sau khi PHONG5/6/7 da render xong): Dy yeu cau
# "tap trung don luc cho PHONG8 va PHONG9" - dua PHONG10 (nang nhat, 302
# frame) xuong UU TIEN THAP NHAT, rieng biet voi PHONG7/8/9 (PHONG7 da xong
#100% nen khong con task de claim, khong anh huong gi du van nam chung
# nhom NORMAL). Them 1 nhom moi JOB_IDS_PRIORITY_LOW, cung ap dung UU TIEN
# CUNG giong HIGH: worker CHI thu PHONG10 khi CA NHOM NORMAL (PHONG7/8/9)
# deu het task 'queued' hoan toan.
# ============================================================
# ZERO MANUAL WORKER — Worker khong bao gio phai biet truoc Job nao ton tai.
# Truoc day co 3 bien hardcode:
#   JOB_IDS_PRIORITY_HIGH, JOB_IDS_PRIORITY_NORMAL, JOB_IDS_PRIORITY_LOW
# Cac bien do da bi XOA HOAN TOAN (1.16.5). Thay the bang RPC
# claim_next_task() tren Supabase — RPC nay tu tim task co priority cao nhat
# trong TOAN BO bang tasks, khong can Worker biet job_id nao ton tai.
# Ket qua: them Job moi = chi INSERT vao Supabase, khong sua file nay.
# ============================================================

# GHI CHU (25/07/2026): SHUTDOWN_EXEMPT_HOSTNAMES, HEARTBEAT_INTERVAL_SEC,
# TELEGRAM_BOT_TOKEN/CHAT_ID, STUCK_TASK_THRESHOLD_MIN/ALERT_COOLDOWN_MIN da
# bi XOA khoi day - theo quyet dinh ro rang cua Dy 25/07/2026: bo Heartbeat,
# Watchdog, Auto Shutdown, va Telegram alert KHOI WORKER hoan toan, dua
# Worker ve dung vai tro "Render Engine" don gian (Bootstrap -> Claim Task
# -> Download -> Analyze -> Optimize -> Check B2 -> Render -> Upload ->
# Verify -> Complete). Dy da duoc canh bao ro rui ro (neu 1 frame/worker
# treo, se KHONG CO alert/watchdog nao phat hien, can Dy tu kiem tra thu
# cong) va XAC NHAN CHAP NHAN danh doi nay co chu dich.
# ----- HEARTBEAT (KHOI PHUC 25/07/2026, sau khi tim ra nguyen nhan that
# cua loi "[BI TU CHOI] Task ... da bi requeue cho worker khac giua chung"
# lap lai deu dan tren MOI task du may hoan toan khoe manh).
#
# NGUYEN NHAN GOC (da xac nhan bang cach doc RPC that tren Supabase, KHONG
# phai suy doan): ham requeue_stale_tasks() tren Supabase tu dong thu hoi
# BAT KY task nao dang 'active' ma co last_heartbeat cu hon 240 giay:
#     where status = 'active' and last_heartbeat < now() - interval '240 seconds'
# Khi ban 1.10.0 XOA HAN heartbeat khoi worker (theo quyet dinh bo Background
# Services), cot last_heartbeat KHONG BAO GIO duoc cap nhat nua sau lan
# claim_task() dau tien. Ket qua: MOI task render lau hon 240s (3 frame x
# ~107s = ~320s - dung truong hop pho bien nhat cua CWS) deu bi Supabase
# HIEU LAM la "may da chet" va cuop task giua chung, du worker van dang
# render binh thuong. Day la hau qua day chuyen KHONG luong truoc cua viec
# bo heartbeat - phia Supabase co co che RIENG phu thuoc vao no.
#
# TAI SAO 60s CHU KHONG PHAI 200s (Dy de xuat 200s, Claude duoc uy quyen
# quyet dinh): nguyen tac chuan nganh la chu ky heartbeat ~1/3 nguong
# timeout, de cho phep LO 2-3 nhip ma van an toan. Voi nguong 240s:
#   - 60s  -> bien an toan 4 nhip (lo 3 lan lien tiep van khong sao) [CHON]
#   - 200s -> bien an toan CHUA DEN 2 nhip: chi can 1 lan goi that bai
#             (mang quan net chap chon 1 nhip), lan sau phai doi them 200s
#             -> tong 400s > 240s -> task bi cuop NGAY, du may khoe manh.
# Chon 60s con vi: (a) KHONG phai sua gi ben Supabase (it thanh phan thay
# doi = it rui ro, dung Handbook v3.0 muc 1 "Don gian hon thong minh"),
# (b) day la cau hinh DA CHAY ON DINH truoc ban 1.10.0, (c) may chet that
# duoc phat hien sau 4 phut thay vi 10 phut, (d) tai khong dang ke: 200 may
# x 1 lenh/60s = ~3.3 request/giay, rat nhe voi Postgres. -----
HEARTBEAT_INTERVAL_SEC = 60
POLL_INTERVAL_SEC = 15

# Phien ban cua CHINH FILE NAY - phai tang so nay MOI LAN sua code va cap
# nhat cot latest_version trong bang worker_config (Supabase) tuong ung,
# de cws_worker.bat (lop vo ngoai) biet khi nao can tu tai ban moi ve.
# Xem 10_setup_worker_selfheal.sql.
WORKER_VERSION = "1.16.5"

# JITTER cho Auto Update (them 22/07/2026 toi): khi phat hien co ban moi,
# CHO NGAU NHIEN 1 khoang trong [0, AUTO_UPDATE_JITTER_MAX_SEC] giay TRUOC
# KHI THOAT - tranh tinh huong CA FLEET (vd 50 may) cung phat hien ban moi
# CUNG 1 thoi diem (vi cung kiem tra Supabase gan nhu dong thoi) roi cung
# thoat/tai lai/khoi dong lai dong loat, co the gay nghen bang thong LAN
# quan net hoac dong loat mat kha nang render trong vai chuc giay. Gia tri
# 180s (3 phut) la uoc luong ban dau, CHUA co du lieu that de tinh chinh -
# neu Fleet lon hon nhieu (vd 200+ may), can Dy xac nhan lai co du rai deu
# hay khong.
AUTO_UPDATE_JITTER_MAX_SEC = 180

# ID cua Fleet (dia diem/doi tac) ma may nay thuoc ve - xem bang `fleets`
# trong Supabase. Dy PHAI tu tao 1 dong trong bang `partners` + `fleets`
# cho tung dia diem/doi tac MOI, roi dien dung fleet_id vao day truoc khi
# gui .bat cho may do.
# fleet_id=2 = "Fleet Anh Thong" (50 may, GTX 1660S/RTX 2060S, i3/i5 12th) -
# tao ngay 22/07/2026, KHAC voi fleet_id=1 "Fleet Test" (2 may test cua Dy).
FLEET_ID = 2

# ----- GPU TEXTURE RELOAD FIX (25/07/2026, thu nghiem) - cong tac BAT/TAT
# rieng cho fix loi 'Failed to create GPU texture' (xem docstring ham
# get_gpu_texture_reload_fix_code() de biet chi tiet nguyen nhan/cach fix).
# Dy xac nhan: THU truoc tren 1 may (doi True o DUNG may do), quan sat vai
# job/task xem tan suat loi co giam khong, ROI MOI doi True dong loat cho
# ca Fleet qua Auto Update - KHONG bat mac dinh cho toan bo may ngay tu dau
# vi day la fix CHUA co benchmark truoc/sau xac nhan hieu qua that (con
# THU NGHIEM, khong phai da CHOT). -----
ENABLE_GPU_TEXTURE_RELOAD_FIX = False


# ---------------------------------------------------------------------
# CAI DAT BLENDER PORTABLE (chi lam 1 lan, cache lai cho lan sau)
# ---------------------------------------------------------------------
def ensure_blender_installed():
    if BLENDER_EXE.exists():
        print(f"[setup] Blender da co san: {BLENDER_EXE}")
        return

    print(f"[setup] Chua co Blender, dang tai ban {BLENDER_VERSION}...")
    BLENDER_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = BLENDER_DIR / "blender.zip"

    with requests.get(BLENDER_ZIP_URL, stream=True, timeout=300) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        downloaded = 0
        with open(zip_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    percent = downloaded * 100 // total
                    print(f"\r[setup] Dang tai Blender: {percent}%", end="")
    print("\n[setup] Tai xong, dang giai nen...")

    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(BLENDER_DIR)

    zip_path.unlink()
    print(f"[setup] Da cai Blender xong tai: {BLENDER_EXE}")


# ---------------------------------------------------------------------
# GOOGLE DRIVE DOWNLOAD (cong thuc confirm=t da kiem chung)
# ---------------------------------------------------------------------
def extract_drive_file_id(drive_link):
    match = re.search(r"/d/([a-zA-Z0-9_-]+)", drive_link)
    if match:
        return match.group(1)
    match = re.search(r"id=([a-zA-Z0-9_-]+)", drive_link)
    if match:
        return match.group(1)
    raise ValueError(f"Khong tim thay file ID trong link: {drive_link}")


def download_from_drive(drive_link, dest_path):
    """Tai file tu Google Drive. File lon (>100MB) bi chan boi trang canh bao
    virus scan, phai lay them tham so 'uuid' tu form HTML va goi lai dung
    endpoint drive.usercontent.google.com/download (khong con dung
    drive.google.com/uc + cookie download_warning nhu truoc)."""
    file_id = extract_drive_file_id(drive_link)
    session = requests.Session()

    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    response = session.get(url, stream=True, timeout=60)

    content_type = response.headers.get("Content-Type", "")

    if "text/html" in content_type:
        # Day la trang canh bao virus scan (file lon), can lay uuid tu form HTML
        html = response.text
        uuid_match = re.search(r'name="uuid"\s+value="([^"]+)"', html)
        if not uuid_match:
            raise RuntimeError(
                "Khong tim thay 'uuid' trong trang canh bao Google Drive. "
                "Co the Google da doi lai cau truc trang nay."
            )
        uuid_value = uuid_match.group(1)

        download_url = "https://drive.usercontent.google.com/download"
        params = {
            "id": file_id,
            "export": "download",
            "confirm": "t",
            "uuid": uuid_value,
        }
        response = session.get(download_url, params=params, stream=True, timeout=600)

    with open(dest_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)


def ensure_blend_file(blend_link, blend_file_name):
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    dest_path = WORK_DIR / blend_file_name

    if dest_path.exists():
        print(f"[drive] File .blend da co san (cache): {dest_path}")
        return dest_path

    print(f"[drive] Dang tai {blend_file_name} tu Google Drive...")
    download_from_drive(blend_link, dest_path)
    print(f"[drive] Tai xong: {dest_path}")
    return dest_path


# ---------------------------------------------------------------------
# RENDER BANG BLENDER THAT
# ---------------------------------------------------------------------
# GHI CHU (25/07/2026): ham resize_oversized_textures_in_blend() da bi XOA
# HAN khoi day, sau khi Dy xac nhan BANG THUC NGHIEM: ham nay ghi de VINH
# VIEN len file .blend goc tren dia (qua bpy.ops.wm.save_mainfile()), va
# gay ra loi "Failed to create GPU texture" LAP LAI VINH VIEN tren nhieu
# task/frame/may khac nhau cua Titan Station (Task 405-414) - trong khi
# file GOC (tai lai tu Drive, chua qua ham nay) render frame 29 THANH CONG
# HOAN TOAN. Day la BANG CHUNG TRUC TIEP, khong con la gia thuyet TDR/VRAM
# nhu dieu tra truoc do. Neu can toi uu texture trong tuong lai, PHAI thiet
# ke lai theo huong KHONG GHI DE file goc (vi du: luu ban resize thanh 1
# file .blend RIENG, khong dung ten file goc), va PHAI co benchmark
# truoc/sau xac nhan khong lam hong du lieu truoc khi ap dung lai cho Fleet.


def render_single_frame(blend_path, frame_num, output_dir, optimization_code="", task_id=None):
    """Render DUNG 1 FRAME DUY NHAT.

    DON GIAN HOA (25/07/2026, theo yeu cau ro rang cua Dy): bo watchdog
    thread rieng, bo co che STALL_TIMEOUT_SEC/HARD_TIMEOUT_SEC (tu kill
    Blender neu treo qua lau), bo Telegram alert trong ham nay. Dy da
    duoc canh bao ro rui ro (neu 1 frame treo, worker se dung yen VINH
    VIEN, khong tu phuc hoi, can Dy tu phat hien va restart thu cong) va
    XAC NHAN CHAP NHAN danh doi nay de doi lay do don gian toi da cho
    Worker (dung vai tro Render Engine thuan tuy, khong phai he dieu
    hanh thu nho). Dung lai subprocess.run() blocking don gian, giong
    kien truc truoc 24/07/2026.

    Tra ve tuple (file_path hoac None, error_category hoac None, giay_render)."""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_pattern = str(output_dir / "frame_####")

    cmd = [
        str(BLENDER_EXE),
        "-b", str(blend_path),
        "--enable-autoexec",
    ]
    if optimization_code:
        cmd += ["--python-expr", optimization_code]
    cmd += [
        "-o", output_pattern,
        "-F", "PNG",
        "-s", str(frame_num),
        "-e", str(frame_num),
        "-a",
    ]

    print(f"    [render] Dang render frame {frame_num}...")
    render_start_time = time.time()

    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
    except Exception as e:
        print(f"    [render] LOI: khong the khoi dong Blender: {e}")
        return None, "persistent", None

    render_duration_sec = time.time() - render_start_time
    stderr_text = (result.stdout or "") + (result.stderr or "")

    if result.returncode != 0:
        stderr_lower = stderr_text.lower()
        print(f"    [render] LOI: Blender tra ve ma loi {result.returncode} o frame {frame_num}")
        print(f"    [render] output: {stderr_text[-500:]}")

        if "out of memory" in stderr_lower or ("cuda" in stderr_lower and "memory" in stderr_lower):
            return None, "persistent", None
        elif "cannot read file" in stderr_lower or "missing" in stderr_lower or "invalid" in stderr_lower:
            return None, "permanent", None
        else:
            return None, "persistent", None

    expected_file = output_dir / f"frame_{frame_num:04d}.png"
    if not expected_file.exists():
        print(f"    [render] CANH BAO: khong tim thay file PNG that cua frame {frame_num}.")
        return None, "persistent", None

    is_valid, reason = validate_rendered_image(expected_file)
    if not is_valid:
        print(f"    [validate] LOI frame {frame_num}: {reason}")
        return None, "persistent", None

    print(f"    [render] Frame {frame_num} xong ({render_duration_sec:.1f}s), da xac nhan hop le.")
    return expected_file, None, render_duration_sec

def upload_single_frame(file_path, job_id, task_id):
    """Upload DUNG 1 file len B2 - phien ban rut gon cua upload_results_to_b2
    cho checkpoint per-frame. Dung CHUNG duong dan B2 (renders/{job_id}/
    task_{task_id}/{ten_file}) de khong pha vo cau truc thu muc da co."""
    client = get_b2_client()
    b2_key = f"renders/{job_id}/task_{task_id}/{file_path.name}"
    try:
        client.upload_file(str(file_path), B2_BUCKET, b2_key)
        return True
    except Exception as e:
        print(f"    [upload] LOI khi upload {file_path.name}: {e}")
        return False


def render_frame_range(blend_path, frame_start, frame_end, output_dir):
    """Goi Blender headless render dai frame_start-frame_end.
    Kiem tra KET QUA THAT (file PNG ton tai), khong tin dong log 'Saved:'.

    Tra ve tuple (rendered_files, error_category):
    - Neu thanh cong: (danh_sach_file, None)
    - Neu that bai: ([], 'transient'|'persistent'|'permanent')
    Phan loai theo 06_Research_Retry.md muc 6.1."""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_pattern = str(output_dir / "frame_####")

    cmd = [
        str(BLENDER_EXE),
        "-b", str(blend_path),
        "--enable-autoexec",  # Cho phep chay Driver/script Python trong file
                              # scene. CAN THIET vi mac dinh Blender chan cac
                              # Driver dung ham "khong an toan" (vd noise.cell)
                              # - da gap that trong qua trinh test 2 may
                              # (21/07/2026, file Titan Station). Chap nhan
                              # duoc vi worker CHI render file .blend do Dy
                              # xac dinh qua link Google Drive cu the, khong
                              # phai file bat ky ai tu do upload chay.
        "-o", output_pattern,
        "-F", "PNG",
        "-s", str(frame_start),
        "-e", str(frame_end),
        "-a",
    ]

    print(f"    [render] Dang render frame {frame_start}-{frame_end}...")
    render_start_time = time.time()
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
    except subprocess.TimeoutExpired:
        # Qua 1 tieng khong xong - co the may qua yeu hoac scene qua nang,
        # coi la persistent (may khac co the lam duoc)
        print("    [render] LOI: Qua thoi gian render toi da (timeout 3600s).")
        return [], "persistent", None
    render_duration_sec = time.time() - render_start_time

    if result.returncode != 0:
        stderr_lower = result.stderr.lower()
        print(f"    [render] LOI: Blender tra ve ma loi {result.returncode}")
        print(f"    [render] stderr: {result.stderr[-500:]}")

        # Phan loai theo noi dung stderr (06_Research_Retry.md 6.1)
        if "out of memory" in stderr_lower or "cuda" in stderr_lower and "memory" in stderr_lower:
            # Het VRAM - PERSISTENT, may khac VRAM lon hon co the lam duoc
            return [], "persistent", None
        elif "cannot read file" in stderr_lower or "missing" in stderr_lower or "invalid" in stderr_lower:
            # File .blend hong/thieu asset - PERMANENT, may nao cung se loi giong nhau
            return [], "permanent", None
        else:
            # Khong xac dinh duoc nguyen nhan cu the - mac dinh PERSISTENT
            # (an toan hon PERMANENT vi con cho phep thu tren may khac truoc
            # khi ket luan han la loi file, dung theo nguyen tac 06_Research_Retry.md
            # muc 7: "khong co gang phan loai loi 100% chinh xac ngay lan dau")
            return [], "persistent", None

    rendered_files = []
    for frame_num in range(frame_start, frame_end + 1):
        expected_file = output_dir / f"frame_{frame_num:04d}.png"
        if expected_file.exists():
            rendered_files.append(expected_file)

    expected_count = frame_end - frame_start + 1
    seconds_per_frame = render_duration_sec / expected_count if expected_count > 0 else None

    if len(rendered_files) != expected_count:
        print(f"    [render] CANH BAO: chi co {len(rendered_files)}/{expected_count} "
              f"file PNG thuc su ton tai. Co the co frame bi loi.")
        if len(rendered_files) == 0:
            return [], "persistent", None
        # Co mot so frame thanh cong, mot so khong - van coi la thanh cong mot phan,
        # tra ve nhung gi render duoc (khong chan toan bo task vi 1-2 frame loi)
    else:
        print(f"    [render] Xac nhan du {len(rendered_files)} file PNG that "
              f"({seconds_per_frame:.1f} giay/frame).")

    # RESULT VALIDATION (theo dung 3 kiem tra cua nganh - SuperRenders Farm):
    # loc ra frame nao render THAT SU dung (khong chi "co file"), tach rieng
    # frame bi loi (den/trang toan phan, corrupt) khoi danh sach se upload.
    valid_files = []
    invalid_frames = []
    for f in rendered_files:
        is_valid, reason = validate_rendered_image(f)
        if is_valid:
            valid_files.append(f)
        else:
            invalid_frames.append((f.name, reason))
            print(f"    [validate] LOI frame {f.name}: {reason}")

    if invalid_frames:
        print(f"    [validate] {len(invalid_frames)}/{len(rendered_files)} "
              f"frame khong hop le, se KHONG upload cac frame nay.")

    if not valid_files:
        # Toan bo frame trong task nay deu loi noi dung (vd toan bo scene
        # loi anh sang) - coi la persistent, cho worker/may khac thu lai
        return [], "persistent", seconds_per_frame

    return valid_files, None, seconds_per_frame


# ---------------------------------------------------------------------
# RESULT VALIDATION - theo dung 3 kiem tra thuc te cua nganh render farm
# (SuperRenders Farm 2026): file size hop ly, dung resolution, khong den/
# trang toan phan. KHONG lam phuc tap hon (khong checksum/Kafka/Elasticsearch
# nhu OpenCue - qua muc can thiet cho quy mo 1 nguoi cua CWS).
# ---------------------------------------------------------------------
MIN_VALID_FILE_SIZE_BYTES = 200  # File PNG that su tu Blender (co noise/chi tiet
                                    # render) luon nang hon nhieu so voi vai KB -
                                    # 200 bytes chi de chan truong hop CUC DOAN
                                    # (file 0 byte, file bi cat giua chung) - da
                                    # tu kiem chung bang test tay: anh nhan tao
                                    # don gian 200x200 van ~500-600 bytes, nguong
                                    # nay khong lam sai lech ket qua that
BLACK_WHITE_THRESHOLD = 2  # do lech mau toi thieu de khong bi coi la "toan mot mau"
EXPECTED_RESOLUTION = None  # None = khong kiem tra resolution co dinh (Job co the
                              # co resolution khac nhau) - de trong, chi kiem tra
                              # anh CO kich thuoc hop le (khong phai 0x0/corrupt)


def validate_rendered_image(file_path):
    """Kiem tra 1 file PNG da render THAT SU dung, khong chi la 'co ton tai'.
    Tra ve (is_valid: bool, reason: str)."""
    try:
        file_size = file_path.stat().st_size
    except OSError as e:
        return False, f"khong doc duoc file: {e}"

    if file_size < MIN_VALID_FILE_SIZE_BYTES:
        return False, f"file qua nho ({file_size} bytes) - render that bai am tham"

    try:
        with Image.open(file_path) as img:
            img.verify()  # kiem tra file PNG khong bi corrupt o tang cau truc

        # verify() lam "hong" doi tuong Image, phai mo lai de doc pixel that
        with Image.open(file_path) as img:
            width, height = img.size
            if width == 0 or height == 0:
                return False, f"kich thuoc anh khong hop le ({width}x{height})"

            # Lay mau vai diem de kiem tra "toan mot mau" (den/trang toan phan)
            # - khong quet toan bo pixel (cham voi anh do phan giai cao), chi
            # lay 1 mau nho o giua + 4 goc, du de phat hien truong hop ro rang
            img_rgb = img.convert("RGB")
            sample_points = [
                (width // 2, height // 2),
                (width // 4, height // 4),
                (3 * width // 4, height // 4),
                (width // 4, 3 * height // 4),
                (3 * width // 4, 3 * height // 4),
            ]
            colors = [img_rgb.getpixel(p) for p in sample_points]

            all_same = all(
                max(abs(c[0] - colors[0][0]), abs(c[1] - colors[0][1]), abs(c[2] - colors[0][2]))
                <= BLACK_WHITE_THRESHOLD
                for c in colors
            )
            if all_same:
                r, g, b = colors[0]
                if r < 10 and g < 10 and b < 10:
                    return False, "anh den toan phan - co the thieu anh sang/camera clip sai"
                elif r > 245 and g > 245 and b > 245:
                    return False, "anh trang toan phan - co the loi material/render engine"
                # Mot mau khac den/trang (vd toan mau xanh nen) van co the la
                # dung (background solid color that su cua scene) - khong
                # tu dong bao loi, chi bao loi khi la den/trang cu the

    except Exception as e:
        return False, f"file PNG bi loi/corrupt: {e}"

    return True, "hop le"


# ---------------------------------------------------------------------
# UPLOAD KET QUA LEN B2
# ---------------------------------------------------------------------
def get_b2_client():
    return boto3.client(
        "s3",
        endpoint_url=B2_ENDPOINT,
        aws_access_key_id=B2_KEY_ID,
        aws_secret_access_key=B2_APP_KEY,
        config=Config(
            signature_version="s3v4",
            connect_timeout=30,
            read_timeout=60,
            # MOI (23/07/2026): truoc day KHONG dat timeout tuong minh -
            # boto3 dung mac dinh CO THE qua dai (connect 60s, read khong
            # gioi han trong mot so phien ban) - neu B2 phan hoi cham bat
            # thuong, worker co the bi treo lau hon can thiet, anh huong
            # toi heartbeat timeout (240s o Scheduler). Gia tri 30s/60s la
            # UOC LUONG BAN DAU, CHUA co du lieu that de tinh chinh - neu
            # thay upload/download file lon (vd render 4K) bi timeout
            # nham, can tang read_timeout len.
        ),
    )


def get_existing_frames_on_b2(job_id, task_id):
    """INCREMENTAL RECOVERY (thiet ke chot 22/07/2026 dem, theo phan bien
    cua Dy: list_objects 1 LAN CHO CA PREFIX, KHONG head tung frame rieng -
    tranh nhieu request len B2 khi Fleet lon).

    Muc dich: khi 1 task bi requeue (worker cu bi mat lien lac giua chung,
    da upload duoc mot so frame truoc do qua Checkpoint per-frame), worker
    MOI nhan lai CHINH task do (cung task_id, generation moi) se biet
    NGAY frame nao da co san tren B2 tu truoc, KHONG render lai tu dau.

    Goi ham nay DUNG 1 LAN moi khi vua claim duoc task, TRUOC vong lap
    render - KHONG goi lai trong vong lap (tranh goi B2 nhieu lan khong
    can thiet).

    Tra ve: set(int) cac frame_num da ton tai tren B2 (CHUA validate noi
    dung - chi biet la CO FILE, phai goi validate_existing_frame_on_b2()
    rieng truoc khi tin frame do la hop le)."""
    client = get_b2_client()
    prefix = f"renders/{job_id}/task_{task_id}/"
    existing = set()
    try:
        resp = client.list_objects_v2(Bucket=B2_BUCKET, Prefix=prefix)
        for obj in resp.get("Contents", []):
            filename = obj["Key"].rsplit("/", 1)[-1]  # vd "frame_0007.png"
            if filename.startswith("frame_") and filename.endswith(".png"):
                try:
                    frame_num = int(filename[len("frame_"):-len(".png")])
                    existing.add(frame_num)
                except ValueError:
                    continue  # ten file khong dung dinh dang, bo qua an toan
    except Exception as e:
        print(f"    [recovery] Khong list duoc B2 cho task {task_id} "
              f"(loi: {e}) - COI NHU CHUA CO FRAME NAO, render lai binh "
              f"thuong tu dau (an toan hon la gia dinh sai).")
        return set()  # LOI mang/B2 -> COI NHU RONG, khong chan worker
    return existing


def validate_existing_frame_on_b2(job_id, task_id, frame_num, output_dir):
    """Tai 1 frame DA CO SAN tren B2 ve local de VALIDATE LAI truoc khi
    tin - KHONG tin mu chi vi file ton tai, vi worker truoc co the da bi
    cat dung luc dang upload do dang (file hong/thieu). Dung LAI ham
    validate_rendered_image() da co san, KHONG viet logic validate rieng.

    Tra ve: Path cua file local neu HOP LE, None neu KHONG hop le/loi."""
    client = get_b2_client()
    b2_key = f"renders/{job_id}/task_{task_id}/frame_{frame_num:04d}.png"
    output_dir.mkdir(parents=True, exist_ok=True)
    local_path = output_dir / f"frame_{frame_num:04d}.png"
    try:
        client.download_file(B2_BUCKET, b2_key, str(local_path))
    except Exception as e:
        print(f"    [recovery] Khong tai duoc frame {frame_num} da co tren "
              f"B2 de kiem tra lai (loi: {e}) - se RENDER LAI frame nay "
              f"cho chac chan (an toan hon la gia dinh no dung).")
        return None

    is_valid, reason = validate_rendered_image(local_path)
    if not is_valid:
        print(f"    [recovery] Frame {frame_num} da co tren B2 nhung "
              f"KHONG HOP LE ({reason}) - co the worker truoc bi cat giua "
              f"luc upload. Se RENDER LAI frame nay.")
        return None

    print(f"    [recovery] Frame {frame_num} da co san tren B2 VA hop le - "
          f"BO QUA render, dung lai ban da co.")
    return local_path


def upload_results_to_b2(rendered_files, job_id, task_id):
    client = get_b2_client()
    uploaded_count = 0

    for file_path in rendered_files:
        b2_key = f"renders/{job_id}/task_{task_id}/{file_path.name}"
        try:
            client.upload_file(str(file_path), B2_BUCKET, b2_key)
            uploaded_count += 1
        except Exception as e:
            print(f"    [upload] LOI khi upload {file_path.name}: {e}")
            return False, uploaded_count

    print(f"    [upload] Da upload {uploaded_count}/{len(rendered_files)} file len B2.")
    return uploaded_count == len(rendered_files), uploaded_count


# ---------------------------------------------------------------------
# SUPABASE RPC
# ---------------------------------------------------------------------
def get_worker_id():
    # QUAN TRONG: luu vao BASE_DIR (E:\CWS_Render), KHONG luu canh file .py -
    # neu 2 file .bat/.py dat o o he thong (C:) bi bootROM reset, luu canh
    # file se MAT id nay moi lan tat may, khien 1 may vat ly bi dem thanh
    # NHIEU worker_id khac nhau qua thoi gian (sai lech du lieu Fleet). BASE_DIR
    # o E:\ khong bi reset nen giu duoc worker_id on dinh qua cac lan khoi dong.
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    id_file = BASE_DIR / "cws_worker_id.txt"
    try:
        with open(id_file, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        new_id = f"WORKER-{uuid.uuid4().hex[:8].upper()}"
        with open(id_file, "w") as f:
            f.write(new_id)
        return new_id


def get_worker_vram_mb():
    """Tu dong lay VRAM that qua nvidia-smi (07_Research_WorkerCapability.md).
    Tra ve so nguyen MiB neu thanh cong, None neu khong lay duoc (fallback -
    worker se chi nhan duoc task khong gioi han VRAM, an toan hon doan bua)."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0 or not result.stdout.strip():
            print("[gpu] nvidia-smi khong tra ve du lieu, dung fallback (khong bao cao VRAM).")
            return None

        first_line = result.stdout.strip().split("\n")[0]
        name, vram_str = [x.strip() for x in first_line.split(",")]
        vram_mb = int(vram_str)
        print(f"[gpu] Phat hien: {name}, VRAM: {vram_mb} MiB")
        return vram_mb
    except FileNotFoundError:
        print("[gpu] Khong tim thay nvidia-smi (co the khong phai GPU NVIDIA "
              "hoac chua cai driver dung). Dung fallback.")
        return None
    except Exception as e:
        print(f"[gpu] Loi khi doc nvidia-smi: {e}. Dung fallback.")
        return None


def check_for_newer_version():
    """Doc bang worker_config qua REST (SELECT, khong phai RPC - bang nay
    co policy 'allow read worker_config' cho phep doc truc tiep), so sanh
    voi WORKER_VERSION hang so cua CHINH file dang chay. Goi ham nay o 3
    DIEM AN TOAN trong worker_loop(): (1) luc dang ranh, (2) ngay sau khi
    vua xong CA task, (3) MOI (23/07/2026) NGAY SAU MOI FRAME checkpoint
    xong giua task (Huong 1 - giam thoi gian cho update tu "het ca task"
    xuong "het 1 frame"). Best-effort: LOI (mat mang/Supabase) chi tra ve
    False (coi nhu chua co ban moi, TIEP TUC chay ban hien tai) - KHONG
    duoc chan worker vi day la tinh nang phu tro, khong phai logic render
    cot loi."""
    try:
        url = (f"{SUPABASE_URL}/rest/v1/worker_config"
               f"?component=eq.worker_full_py&select=latest_version")
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code >= 400:
            return False
        if not response.text.strip():
            return False
        rows = response.json()
        if not rows:
            return False
        latest_version = rows[0].get("latest_version")
        if not latest_version:
            return False
        return latest_version != WORKER_VERSION
        # So sanh KHAC NHAU (khong phai "lon hon") - du don gian cho MVP,
        # gia dinh Dy luon dien dung version moi hon vao worker_config
        # (khong co co che so sanh semver that). Neu can chinh xac hon
        # (vd tranh downgrade nham), do la cai tien P2, chua can ngay.
    except Exception as e:
        print(f"    [update] Khong kiem tra duoc ban moi (loi: {e}) - "
              f"tiep tuc chay ban hien tai {WORKER_VERSION}.")
        return False


def apply_update_jitter_and_exit(context_message):
    """Dung CHUNG cho ca 2 diem goi check_for_newer_version() (luc dang ranh
    va luc vua xong 1 task) - tranh lap code. CHO NGAU NHIEN truoc khi thoat
    de rai deu thoi diem cac may trong Fleet tu update, KHONG dong loat cung
    luc (xem AUTO_UPDATE_JITTER_MAX_SEC)."""
    jitter_sec = random.uniform(0, AUTO_UPDATE_JITTER_MAX_SEC)
    print(f"[update] Phat hien ban moi hon {WORKER_VERSION} tren Supabase "
          f"({context_message}) - se TU THOAT sau {jitter_sec:.0f}s nua (do "
          f"tre ngau nhien de KHONG ca Fleet cung thoat 1 luc) de .bat tu "
          f"tai ban moi va khoi dong lai, khong can Dy tat/mo CMD tay.")
    time.sleep(jitter_sec)


# ===== REMOTE SHUTDOWN COMMAND (them 26/07/2026) =====
# TINH NANG TACH BIET HOAN TOAN voi Auto Update o tren - dung bang
# Supabase RIENG (remote_commands), KHONG dung chung worker_config.
# Muc dich: cho phep Dy TAT TU XA cac may dang idle (hoac theo VRAM cu
# the) MA KHONG CAN remote/AnyDesk vao tung may - chi can INSERT 1 dong
# vao bang remote_commands tren Supabase.
#
# AN TOAN: chi kiem tra o CUNG 1 DIEM AN TOAN da co san (ngay sau khi
# complete_task/fail_task xong, TRUOC KHI claim task tiep theo) - KHONG
# tao them diem dung moi, KHONG lam gian doan render dang checkpoint
# giua chung. Neu can XOA tinh nang nay: chi can xoa dung ham
# check_remote_shutdown_command() ben duoi VA 3 dong goi no trong
# worker_loop() (tim theo comment "REMOTE SHUTDOWN") - khong dung cham
# gi den Auto Update, claim_task, hay bat ky logic nao khac.
SHUTDOWN_COMMAND_WINDOW_MINUTES = 30


def check_remote_shutdown_command(worker_id, vram_mb):
    """Doc bang remote_commands (TACH BIET voi worker_config/auto-update).
    Kiem tra co lenh 'shutdown' nao ap dung cho worker nay khong, dua tren
    target_worker_id (khop dung worker_id) HOAC target_vram_mb (khop dung
    VRAM, ap dung cho ca nhom may cung cau hinh). target_worker_id/
    target_vram_mb = NULL nghia la "ap dung cho tat ca". Best-effort: loi
    mang chi tra ve False (KHONG lenh nao), KHONG duoc chan worker vi day
    la tinh nang phu tro, khong phai logic render cot loi.

    SUA LOI NGHIEM TRONG (26/07/2026): ban dau ham nay KHONG loc theo thoi
    gian, nen 1 lenh shutdown da nhap se ton tai VINH VIEN trong bang ->
    hom sau doi tac bat may len, worker doc lai dung lenh cu do va TU TAT
    NGAY, lap di lap lai, may khong bao gio dung duoc nua (phai remote vao
    tung may xoa tay). Nay CHI chap nhan lenh duoc tao trong vong
    SHUTDOWN_COMMAND_WINDOW_MINUTES phut gan day - lenh cu tu dong het
    hieu luc, he thong tu lanh, khong can don dep bang tay."""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(
            minutes=SHUTDOWN_COMMAND_WINDOW_MINUTES)
        # Hau to "Z" TUONG MINH la UTC - khong phu thuoc cau hinh TimeZone
        # cua Postgres (hien tai la UTC, nhung khong nen dua vao gia dinh do).
        cutoff_iso = cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")
        url = (f"{SUPABASE_URL}/rest/v1/remote_commands"
               f"?command=eq.shutdown&created_at=gte.{cutoff_iso}"
               f"&order=created_at.desc&limit=10")
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code >= 400 or not response.text.strip():
            return False
        rows = response.json()
        for row in rows:
            target_worker = row.get("target_worker_id")
            target_vram = row.get("target_vram_mb")
            consumed = row.get("consumed_by") or []
            if worker_id in consumed:
                continue  # worker nay da xu ly lenh nay roi, bo qua
            matches_worker = (target_worker is None or target_worker == worker_id)
            matches_vram = (target_vram is None or target_vram == vram_mb)
            if matches_worker and matches_vram:
                return True
        return False
    except Exception as e:
        print(f"    [remote_shutdown] Khong kiem tra duoc lenh tu xa (loi: {e}) - "
              f"tiep tuc chay binh thuong.")
        return False


def rpc_call(function_name, payload):
    url = f"{SUPABASE_URL}/rest/v1/rpc/{function_name}"
    response = requests.post(url, headers=HEADERS, json=payload, timeout=15)
    if response.status_code >= 400:
        print(f"    [LOI RPC {function_name}] HTTP {response.status_code}: {response.text}")
        return None
    # QUAN TRONG (phat hien 22/07/2026): RPC tra ve "void" trong Postgres
    # (vd register_worker, worker_ping) tra ve HTTP 200 nhung BODY RONG -
    # goi response.json() truc tiep se nem loi
    # "json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)".
    # Loi nay TUNG bi bat nham boi try/except o TUNG ham goi rieng le (vd
    # register_worker) - dung, nhung dung o SAI TANG (moi ham phai tu bat
    # loi nay rieng thay vi rpc_call xu ly chung 1 lan). Sua tai day de
    # TAT CA moi ham goi rpc_call deu an toan, khong chi rieng nhung ham
    # da co try/except san.
    if not response.text.strip():
        return None
    try:
        return response.json()
    except ValueError:
        print(f"    [LOI RPC {function_name}] Response khong phai JSON hop le "
              f"(body: {response.text[:200]!r}). Coi nhu khong co du lieu tra ve.")
        return None


def claim_task(job_id, worker_id, worker_vram_mb):
    result = rpc_call("claim_task", {
        "p_job_id": job_id,
        "p_worker_id": worker_id,
        "p_worker_vram_mb": worker_vram_mb,
    })
    if not result:
        return None
    row = result[0]
    # QUAN TRONG: claim_task la Postgres function "returns table(...)" - khi
    # KHONG con task nao de claim, RPC van tra ve 1 DONG DUY NHAT voi TAT CA
    # cot la NULL (vd {"task_id": None, "out_frame_start": None, ...}), CHU
    # KHONG PHAI mang rong []. Neu chi kiem tra "if result" se BI SAI (mang
    # co 1 phan tu la truthy) - PHAI kiem tra rieng task_id co None khong.
    # Loi nay da gay that trong test 2 may 22/07/2026: worker cu chay tiep
    # voi task_id=None, frame_start=None, khien Blender nhan tham so
    # "--frame-start None" khong hop le va bao loi ma 3221226505.
    if row.get("task_id") is None:
        return None
    return row


def claim_next_task(worker_id, worker_vram_mb):
    """ZERO MANUAL WORKER: thay the vong lap claim_task(job_id) cu.

    Goi RPC claim_next_task() tren Supabase tu tim task priority cao nhat
    trong TOAN BO bang tasks. Worker khong can biet truoc job_id nao.
    Tra ve (task_dict, job_id) hoac (None, None) neu khong co task.
    """
    result = rpc_call("claim_next_task", {
        "p_worker_id": worker_id,
        "p_worker_vram_mb": worker_vram_mb,
    })
    if not result:
        return None, None
    row = result[0]
    if row.get("out_task_id") is None:
        return None, None
    task = {
        "task_id": row["out_task_id"],
        "out_frame_start": row["out_frame_start"],
        "out_frame_end": row["out_frame_end"],
        "out_generation": row["out_generation"],
    }
    return task, row["out_job_id"]


def report_heartbeat(task_id, generation, worker_id):
    """Bao "toi con song VA van dang lam DUNG task nay" cho Supabase - cap
    nhat cot tasks.last_heartbeat. BAT BUOC PHAI CO: ham requeue_stale_tasks()
    tren Supabase tu dong thu hoi moi task 'active' co last_heartbeat cu hon
    240 giay (xem ghi chu day du tai HEARTBEAT_INTERVAL_SEC).

    Tra ve True neu Supabase XAC NHAN task nay VAN THUOC worker nay (dung
    generation, dung worker_id, status van 'active'). Tra ve False nghia la
    task DA BI GIAO CHO WORKER KHAC (thuong do da bi requeue_stale_tasks thu
    hoi truoc do) - luc do worker nay dang render VO ICH, ket qua se bi
    complete_task() tu choi (Fencing Token bao ve dung)."""
    return rpc_call("report_heartbeat", {
        "p_task_id": task_id, "p_generation": generation, "p_worker_id": worker_id
    }) is True


def heartbeat_loop(task_id, generation, worker_id, stop_event):
    """Chay o THREAD RIENG suot thoi gian worker lam 1 task. CHI lam DUNG 2
    viec (ban TOI GIAN theo quyet dinh Dy 25/07/2026 - KHONG Telegram, KHONG
    Watchdog, KHONG Auto Shutdown):
      1. Cap nhat tasks.last_heartbeat de Supabase biet may nay con song
         (neu khong, requeue_stale_tasks() se cuop task sau 240s).
      2. worker_ping() de cap nhat workers.last_seen_at (tang Fleet).

    NEU heartbeat tra ve False (task da bi giao cho worker khac): dat co
    stop_event de bao cho vong lap chinh biet, VA TU THOAT tien trinh Python
    (os._exit) - theo dung yeu cau Dy: "tu tat bat va khoi dong lai".
    cws_worker.bat (lop vo ngoai) dang cho san se tu phat hien Python vua
    thoat, doi COOLDOWN_SEC roi tu khoi dong lai ban moi - worker se claim
    task khac tu dau, sach se, thay vi tiep tuc render VO ICH mot task ma
    ket qua chac chan bi complete_task() tu choi."""
    while not stop_event.is_set():
        stop_event.wait(HEARTBEAT_INTERVAL_SEC)
        if stop_event.is_set():
            break
        try:
            ok = report_heartbeat(task_id, generation, worker_id)
            worker_ping(worker_id)
            if not ok:
                print(f"\n{'!' * 60}")
                print(f"[heartbeat] Task {task_id} DA BI GIAO CHO WORKER KHAC "
                      f"(generation={generation} khong con hop le tren Supabase).")
                print("[heartbeat] Dang render VO ICH - ket qua se bi tu choi. "
                      "TU THOAT ngay de cws_worker.bat khoi dong lai va nhan "
                      "task khac tu dau.")
                print(f"{'!' * 60}\n", flush=True)
                stop_event.set()
                os._exit(1)  # Thoat NGAY - .bat se tu khoi dong lai (co che da
                              # co san trong vong lap :check_update cua .bat)
        except Exception as e:
            print(f"[heartbeat] Canh bao: loi khi report heartbeat: {e} - "
                  f"se tiep tuc thu lai, chua dung worker")


def complete_task(task_id, generation, worker_id):
    return rpc_call("complete_task", {
        "p_task_id": task_id, "p_generation": generation, "p_worker_id": worker_id
    }) is True


def fail_task(task_id, generation, worker_id, error_type):
    """Bao loi that su (khong phai heartbeat timeout) theo phan loai
    3 nhom trong 06_Research_Retry.md: transient / persistent / permanent.
    Tra ve trang thai cuoi: 'requeued' / 'permanent' / 'rejected' / None (loi goi RPC)."""
    return rpc_call("fail_task", {
        "p_task_id": task_id,
        "p_generation": generation,
        "p_worker_id": worker_id,
        "p_error_type": error_type,
    })


def report_render_speed(job_id, seconds_per_frame):
    """Bao toc do render that do duoc (03_Scheduler_Tuning.md Chuong 8).
    Chi co y nghia khi goi SAU KHI hoan thanh probe task dau tien cua job -
    RPC tu kiem tra job co con o trang thai 'probing' khong, goi nhieu lan
    van an toan (lan 2 tro di se khong lam gi, tra ve -1)."""
    return rpc_call("report_render_speed", {
        "p_job_id": job_id,
        "p_seconds_per_frame": seconds_per_frame,
    })


def log_task_event(task_id, worker_id, message):
    """Ghi 1 dong log ngan cho task dang lam - de Dy xem duoc tu Supabase
    (SELECT last_log from tasks), khong can vao tung may doc log rieng.
    Khong chan luong chinh neu that bai (log la phu, khong phai logic cot loi) -
    loi ghi log khong duoc lam gay ca task dang render."""
    try:
        return rpc_call("log_task_event", {
            "p_task_id": task_id,
            "p_worker_id": worker_id,
            "p_message": message,
        })
    except Exception:
        return False  # log that bai khong quan trong bang viec render tiep tuc


def report_worker_crash(worker_id, error_message):
    """Bao crash ve Supabase TRUOC KHI thoat vi loi khong luong truoc
    (unhandled exception). Day la buoc BEST-EFFORT - neu chinh viec goi
    RPC nay cung that bai (vd mat mang dung luc crash), PHAI nuot loi va
    cho worker thoat binh thuong, KHONG duoc de loi bao cao lam crash
    chong crash. Muc dich: Dy xem duoc worker nao crash, crash may lan,
    thong diep loi gi tu Supabase (bang workers), khong can vao tung may."""
    try:
        rpc_call("report_worker_crash", {
            "p_worker_id": worker_id,
            "p_error_message": str(error_message),
        })
    except Exception:
        pass  # khong duoc de buoc bao cao lam crash them lan nua


def analyze_blend_scene(blend_path):
    """CWS Scene Analyzer (tich hop, KHONG can file .py rieng) - Render
    Optimizer. Goi Blender headless voi --python-expr de doc thong tin
    scene (Light/Shadow/Texture/Polygon/Samples), PHAN LOAI muc do nang
    (Level 0-3) VA tra ve danh sach thay doi AN TOAN co the tu dong ap
    dung (xem apply_safe_optimizations).

    QUAN TRONG - PHAM VI (chot voi Dy 22/07/2026 sau nhieu vong lam ro):
    - Worker CHI tu dong ap dung nhung thay doi KHONG lam khac hinh anh
      dau ra (vd bat Adaptive Sampling, bat Persistent Data) - day la ky
      thuat tang toc NOI BO cua Blender, ket qua render RA GIONG HET.
    - Worker TUYET DOI KHONG tu dong doi Shadow resolution/Texture/tat
      Volumetric/giam Samples - nhung thay doi NAY LAM ANH KHAC BAN GOC,
      van CHI o muc BAO CAO (in ra log), CHUA duoc phep tu ap dung, vi
      can it nhat 1 lan Dy xac nhan tren don hang that truoc.

    CHAY 1 LAN DUY NHAT cho ca JOB (khong phai moi worker/moi task) - xem
    get_or_create_optimization_plan() de biet co che chia se ket qua giua
    50 worker (Phuong an C - chi 1 worker phan tich, cac worker con lai
    doc lai tu Supabase, KHONG tu phan tich rieng, tranh lang phi + tranh
    50 lan tai/mo file .blend chi de phan tich)."""
    # Doan code Python se chay BEN TRONG tien trinh Blender (qua --python-expr),
    # KHAC voi Python thuong dang chay file cws_worker_full.py nay - vi vay
    # KHONG THE import bpy truc tiep o day, phai goi Blender nhu 1 tien
    # trinh con (giong het cach render_single_frame() da lam).
    analyzer_code = r'''
import bpy, json, sys

THRESHOLDS = {
    "shadow_light_count_heavy": 20, "shadow_light_count_medium": 8,
    "total_light_count_heavy": 100, "total_light_count_medium": 30,
    "texture_res_heavy": 8192, "texture_res_medium": 4096,
    "samples_cycles_heavy": 1024, "samples_cycles_medium": 256,
    "poly_count_heavy": 5000000, "poly_count_medium": 1000000,
}

scene = bpy.context.scene
frame_start = scene.frame_start
frame_end = scene.frame_end
frame_step = scene.frame_step
total_frames = ((frame_end - frame_start) // frame_step) + 1 if frame_step > 0 else (frame_end - frame_start + 1)

lights_objs = [o for o in scene.objects if o.type == 'LIGHT']
total_lights = len(lights_objs)
shadow_count = sum(1 for o in lights_objs if getattr(o.data, "use_shadow", False))

max_tex = 0
tex_count = 0
oversized_textures = []
TEXTURE_RESIZE_THRESHOLD = 2048
for img in bpy.data.images:
    tex_count += 1
    try:
        max_tex = max(max_tex, img.size[0], img.size[1])
        if img.size[0] > TEXTURE_RESIZE_THRESHOLD or img.size[1] > TEXTURE_RESIZE_THRESHOLD:
            # SUA (24/07/2026): BO dieu kien "not img.packed_file" - da
            # xac nhan qua thuc te TOAN BO 51 anh cua Goros Lair.blend
            # deu packed_file=True, dieu kien cu loai bo het khoi danh
            # sach nay khien resize khong bao gio chay. Field nay gio
            # CHI dung de BAO CAO/log (biet co bao nhieu anh vuot
            # nguong) - viec resize THAT su do resize_oversized_
            # textures_in_blend() tu quet rieng ben trong Blender,
            # KHONG con phu thuoc danh sach nay nua.
            name_or_path = img.name
            oversized_textures.append([name_or_path, img.size[0], img.size[1]])
    except Exception:
        pass

polys = 0
for obj in scene.objects:
    if obj.type == 'MESH' and obj.data:
        polys += len(obj.data.polygons)

engine = scene.render.engine
samples = None
motion_blur = scene.render.use_motion_blur
volumetric_count = 0
shadow_cube_size = None
shadow_cascade_size = None
if engine == 'CYCLES':
    samples = scene.cycles.samples
    for mat in bpy.data.materials:
        if mat.use_nodes and mat.node_tree:
            for node in mat.node_tree.nodes:
                if "Volume" in node.type:
                    volumetric_count += 1
                    break
elif engine in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    samples = getattr(scene.eevee, "taa_render_samples", None)
    shadow_cube_size = getattr(scene.eevee, "shadow_cube_size", None)
    shadow_cascade_size = getattr(scene.eevee, "shadow_cascade_size", None)

reasons = []
level = 0
if shadow_count >= THRESHOLDS["shadow_light_count_heavy"]:
    level = max(level, 3)
    reasons.append(f"CANH BAO NANG: {shadow_count} shadow-casting light (giong Goros Lair)")
elif shadow_count >= THRESHOLDS["shadow_light_count_medium"]:
    level = max(level, 2)
    reasons.append(f"{shadow_count} shadow-casting light (muc trung binh)")
if total_lights >= THRESHOLDS["total_light_count_heavy"]:
    level = max(level, 2)
    reasons.append(f"Tong {total_lights} light trong scene")
if max_tex >= THRESHOLDS["texture_res_heavy"]:
    level = max(level, 2)
    reasons.append(f"Texture toi da {max_tex}px (>= 8K)")
elif max_tex >= THRESHOLDS["texture_res_medium"]:
    level = max(level, 1)
    reasons.append(f"Texture toi da {max_tex}px (4K)")
if polys >= THRESHOLDS["poly_count_heavy"]:
    level = max(level, 2)
    reasons.append(f"{polys} polygon (rat nhieu)")
elif polys >= THRESHOLDS["poly_count_medium"]:
    level = max(level, 1)
    reasons.append(f"{polys} polygon (kha nhieu)")
if samples is not None:
    if samples >= THRESHOLDS["samples_cycles_heavy"]:
        level = max(level, 2)
        reasons.append(f"Samples = {samples} (rat cao)")
    elif samples >= THRESHOLDS["samples_cycles_medium"]:
        level = max(level, 1)
        reasons.append(f"Samples = {samples} (trung binh-cao)")
if motion_blur:
    level = max(level, 1)
    reasons.append("Motion Blur dang BAT")
if volumetric_count > 0:
    level = max(level, 2)
    reasons.append(f"{volumetric_count} vat lieu Volume (rat nang)")
if not reasons:
    reasons.append("Khong phat hien yeu to nang bat thuong")

# --- KIEM TRA "KHONG CO ANH SANG" (bo sung 24/07/2026, sau su co Task 232
# Job CWS-JOB2 - file Goros Lair co 0 light, render ra anh den toan phan
# tren MOI may, ton 1 luot render + validate_rendered_image() moi phat
# hien duoc PERMANENT). Day la loi KHAC LOAI voi "qua nhieu light" o tren:
# khong phai "nang/cham" ma la "chac chan ra ket qua vo nghia" - nen dung
# level rieng (4, cao hon heavy=3) de code goi ham DE PHAN BIET va co the
# CHAN som truoc khi ton 1 lan render that.
world = scene.world
world_has_light = False
if world is not None and world.use_nodes and world.node_tree:
    for node in world.node_tree.nodes:
        if node.type == 'BACKGROUND':
            col = node.inputs.get('Color')
            strength = node.inputs.get('Strength')
            if col and strength:
                try:
                    r, g, b = col.default_value[0], col.default_value[1], col.default_value[2]
                    s = strength.default_value
                    if s > 0.01 and (r > 0.01 or g > 0.01 or b > 0.01):
                        world_has_light = True
                except Exception:
                    pass

no_light_warning = None
if total_lights == 0 and not world_has_light:
    level = max(level, 4)
    no_light_warning = (
        f"KHONG CO NGUON SANG NAO: 0 Light object VA World "
        f"('{world.name if world else 'None'}') khong phat sang dang ke. "
        f"Scene nay se render ra anh DEN TOAN PHAN tren BAT KY may nao - "
        f"day la loi trong chinh file .blend, KHONG PHAI loi may/worker."
    )
    reasons.append(no_light_warning)

# ===== SCENE OPTIMIZER GIAI DOAN 1 (them 25/07/2026) =====
# CHI DOC, KHONG SUA GI. Muc dich: THU THAP DU LIEU THAT tu cac file khach
# de biet nhom nao THUC SU nang, TRUOC KHI quyet dinh xay tinh nang toi uu
# cho nhom do (dung Handbook v3.0 muc 1 "Do truoc khi toi uu" va muc 10
# "Complexity Budget"). KHONG tu dong sua bat cu gi o giai doan nay.
#
# CO SO CHON 5 NHOM NAY (nghien cuu 25/07/2026, nguon: Blender bug tracker
# + tai lieu render farm): voi EEVEE, giam texture chu yeu giup VUA VRAM
# (tranh crash 'Failed to create GPU texture'), CHU KHONG giam thoi gian
# render dang ke. Thu that su lam CHAM render EEVEE la: volumetric, shadow
# do phan giai cao, samples, va so luong instance/particle lon. Vi vay 5
# nhom duoi day duoc chon de DO, phan biet ro 2 muc tieu khac nhau:
#   - Nhom giup TRANH CRASH VRAM: Volume/VDB, texture (da co san o tren)
#   - Nhom giup GIAM THOI GIAN: Geometry Nodes, Particle/Hair, Subdivision

# --- 1. VOLUME / VDB (nghi la nang nhat cho ca VRAM lan thoi gian) ---
volume_objects = []
volume_total_voxels_est = 0
for obj in scene.objects:
    if obj.type == 'VOLUME' and obj.data:
        try:
            vol_name = obj.name
            grids_count = len(obj.data.grids) if hasattr(obj.data, "grids") else 0
            volume_objects.append([vol_name, grids_count])
        except Exception:
            pass

# Dem so material co node Volume (khac voi object type VOLUME o tren -
# day la volumetric qua shader, vd Principled Volume trong world/material)
volume_shader_materials = []
for mat in bpy.data.materials:
    if mat.use_nodes and mat.node_tree:
        for node in mat.node_tree.nodes:
            if node.type in ('VOLUME_SCATTER', 'VOLUME_ABSORPTION', 'PRINCIPLED_VOLUME'):
                volume_shader_materials.append(mat.name)
                break

world_has_volume = False
if world is not None and world.use_nodes and world.node_tree:
    for node in world.node_tree.nodes:
        if node.type in ('VOLUME_SCATTER', 'VOLUME_ABSORPTION', 'PRINCIPLED_VOLUME'):
            world_has_volume = True
            break

# --- 2. GEOMETRY NODES (co the sinh ra hang trieu instance) ---
geo_nodes_objects = []
geo_nodes_total_node_count = 0
for obj in scene.objects:
    for mod in obj.modifiers:
        if mod.type == 'NODES':
            try:
                ng = mod.node_group
                node_count = len(ng.nodes) if ng else 0
                geo_nodes_total_node_count += node_count
                geo_nodes_objects.append([obj.name, ng.name if ng else "None", node_count])
            except Exception:
                pass

# --- 3. PARTICLE / HAIR (de tao so luong doi tuong khong lo) ---
particle_systems = []
particle_total_count = 0
for obj in scene.objects:
    if hasattr(obj, "particle_systems"):
        for psys in obj.particle_systems:
            try:
                settings = psys.settings
                count = getattr(settings, "count", 0)
                ptype = getattr(settings, "type", "UNKNOWN")
                child_count = getattr(settings, "rendered_child_count", 0)
                particle_total_count += count + child_count
                particle_systems.append([obj.name, psys.name, ptype, count, child_count])
            except Exception:
                pass

# --- 4. MODIFIER (chua apply, tinh lai moi frame) ---
modifier_summary = {}
modifier_heavy_objects = []
HEAVY_MODIFIER_TYPES = {'SUBSURF', 'MULTIRES', 'REMESH', 'BOOLEAN',
                         'PARTICLE_SYSTEM', 'CLOTH', 'FLUID', 'OCEAN',
                         'EXPLODE', 'SMOKE'}
for obj in scene.objects:
    heavy_on_this_obj = []
    for mod in obj.modifiers:
        modifier_summary[mod.type] = modifier_summary.get(mod.type, 0) + 1
        if mod.type in HEAVY_MODIFIER_TYPES:
            heavy_on_this_obj.append(mod.type)
    if heavy_on_this_obj:
        modifier_heavy_objects.append([obj.name, heavy_on_this_obj])

# --- 5. SUBDIVISION (nhan poly len theo cap so nhan: 4^level) ---
subdiv_objects = []
subdiv_max_render_level = 0
for obj in scene.objects:
    for mod in obj.modifiers:
        if mod.type == 'SUBSURF':
            try:
                render_lv = getattr(mod, "render_levels", 0)
                view_lv = getattr(mod, "levels", 0)
                base_polys = len(obj.data.polygons) if obj.type == 'MESH' and obj.data else 0
                # Uoc tinh so poly SAU khi subdivide: moi cap nhan ~4 lan
                est_polys = base_polys * (4 ** render_lv) if render_lv > 0 else base_polys
                subdiv_max_render_level = max(subdiv_max_render_level, render_lv)
                subdiv_objects.append([obj.name, view_lv, render_lv, base_polys, est_polys])
            except Exception:
                pass

subdiv_total_est_polys = sum(row[4] for row in subdiv_objects) if subdiv_objects else 0

# --- 6. DENOISER (them 26/07/2026, cung tinh than "Do truoc khi toi uu"
# nhu 5 nhom tren - CHI DOC/BAO CAO, KHONG tu bat/tat gi). Anh huong lon
# ca thoi gian render (bat denoiser cho phep giam samples ma van sach
# noise) lan chat luong cuoi (thuat toan denoiser khac nhau processing
# khac nhau) - nhung KHONG tu dong bat/tat vi day la lua chon anh huong
# TRUC TIEP hinh anh dau ra, giong nguyen tac da ap dung cho Shadow/
# Texture/Samples o tren (chi bao cao, cho Dy xac nhan tren don hang
# that truoc). Cycles va EEVEE co API denoiser khac nhau. ---
denoiser_enabled = False
denoiser_type = None
if engine == 'CYCLES':
    denoiser_enabled = getattr(scene.cycles, "use_denoising", False)
    denoiser_type = getattr(scene.cycles, "denoiser", None) if denoiser_enabled else None
elif engine in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    # EEVEE Next (Blender 4.2+) co denoiser rieng cho Ray Tracing;
    # EEVEE cu (legacy) khong co khai niem denoiser giong Cycles.
    denoiser_enabled = getattr(scene.eevee, "use_raytracing", False) and \
                        getattr(scene.eevee, "ray_tracing_options", None) is not None
    denoiser_type = "EEVEE_RAYTRACING" if denoiser_enabled else None

if samples is not None and not denoiser_enabled:
    if (engine == 'CYCLES' and samples < THRESHOLDS["samples_cycles_medium"]) or \
       (engine != 'CYCLES'):
        reasons.append(f"DENOISER dang TAT - voi Samples={samples}, bat denoiser "
                        f"co the giam samples can thiet ma van giu chat luong "
                        f"tuong duong (chi la GOI Y, chua tu dong bat)")


# --- Ghi nhan vao reasons (CHI CANH BAO, KHONG tu dong sua) ---
if volume_objects or volume_shader_materials or world_has_volume:
    vol_desc = []
    if volume_objects:
        vol_desc.append(f"{len(volume_objects)} Volume object")
    if volume_shader_materials:
        vol_desc.append(f"{len(volume_shader_materials)} material co Volume shader")
    if world_has_volume:
        vol_desc.append("World co Volume (fog toan canh)")
    reasons.append("VOLUME phat hien: " + ", ".join(vol_desc) +
                    " - day la nhom NANG NHAT cho ca VRAM lan thoi gian render")

if geo_nodes_objects:
    reasons.append(f"GEOMETRY NODES: {len(geo_nodes_objects)} object dung, "
                    f"tong {geo_nodes_total_node_count} node - co the sinh "
                    f"rat nhieu instance khi render")

if particle_total_count > 0:
    reasons.append(f"PARTICLE/HAIR: {len(particle_systems)} he thong, "
                    f"tong ~{particle_total_count} hat/soi (ke ca child)")

if subdiv_max_render_level >= 3:
    reasons.append(f"SUBDIVISION cao: cap toi da {subdiv_max_render_level} "
                    f"(uoc tinh ~{subdiv_total_est_polys} poly sau subdivide)")
elif subdiv_objects:
    reasons.append(f"SUBDIVISION: {len(subdiv_objects)} object, cap toi da "
                    f"{subdiv_max_render_level}")

if modifier_heavy_objects:
    reasons.append(f"MODIFIER nang: {len(modifier_heavy_objects)} object co "
                    f"modifier thuoc nhom nang (chua apply)")

report = {
    "engine": engine, "total_lights": total_lights, "shadow_lights": shadow_count,
    "max_texture_res": max_tex, "texture_count": tex_count, "polygon_count": polys,
    "oversized_textures": oversized_textures,
    "samples": samples, "motion_blur": motion_blur, "volumetric_count": volumetric_count,
    "shadow_cube_size": shadow_cube_size, "shadow_cascade_size": shadow_cascade_size,
    "suggested_level": level, "reasons": reasons,
    "no_light_warning": no_light_warning,
    # ===== TONG SO FRAME (them 26/07/2026, theo yeu cau Dy - de biet tong
    # frame THAT cua file .blend ma KHONG can Dy tu doc log console/cuon
    # tay tim - gio da ghi vao Supabase (job_optimization.analysis) qua
    # RPC set_optimization_plan_if_missing() nhu moi field khac trong
    # report nay, Dy co the SELECT truc tiep tu Supabase). Doc tu
    # scene.frame_start/frame_end/frame_step CUA CHINH FILE .blend (khong
    # phai gia dinh/uoc luong) - day la thiet lap Output Properties > Frame
    # Range ma nguoi tao file .blend da luu san.
    "frame_start": frame_start, "frame_end": frame_end, "frame_step": frame_step,
    "total_frames": total_frames,
    # ===== SCENE OPTIMIZER GIAI DOAN 1 (25/07/2026) - CHI DOC/BAO CAO =====
    # 5 nhom moi do them de THU THAP DU LIEU THAT truoc khi quyet dinh xay
    # tinh nang toi uu. KHONG co bat ky co che tu dong sua nao cho 5 nhom
    # nay - tat ca deu chi de bao cao/thong ke.
    "scene_profile_v1": {
        "volume_objects": volume_objects,
        "volume_shader_materials": volume_shader_materials,
        "world_has_volume": world_has_volume,
        "geo_nodes_objects": geo_nodes_objects,
        "geo_nodes_total_node_count": geo_nodes_total_node_count,
        "particle_systems": particle_systems,
        "particle_total_count": particle_total_count,
        "modifier_summary": modifier_summary,
        "modifier_heavy_objects": modifier_heavy_objects,
        "subdiv_objects": subdiv_objects,
        "subdiv_max_render_level": subdiv_max_render_level,
        "subdiv_total_est_polys": subdiv_total_est_polys,
        "denoiser_enabled": denoiser_enabled,
        "denoiser_type": denoiser_type,
    },
    # CHI 2 co nay la AN TOAN TUYET DOI (khong doi hinh anh dau ra) - day
    # la nhung gi worker tu dong bat KHONG DIEU KIEN.
    "safe_optimizations": {
        "adaptive_sampling": True,
        "persistent_data": True,
    },
    # "GENTLE" (than trong, quyet dinh Dy 22/07/2026 lan 2): giam RAT NHE
    # Samples (toi da -15%) va Shadow giam DUNG 1 nac nho nhat trong thang
    # enum co san - CO THE co sai khac cuc nho ve hinh anh (nhieu hat/do
    # net shadow) nhung o muc chap nhan duoc, KHONG PHAI Level 2-3 manh
    # nhu truoc. Chi tinh toan gia tri GOI Y o day - viec THAT SU ap dung
    # do ham apply_safe_optimizations_args() ben Python quyet dinh.
    "gentle_optimizations": {
        "reduce_samples_percent": 15 if samples and samples >= 200 else 0,
        # Chi giam Samples neu du lon (>=200) - Samples da thap (vd 64,
        # 128) giam them de nhin thay ro noise, khong dang danh doi.
        "shadow_size_enum": ["64", "128", "256", "512", "1024", "2048", "4096"],
        "shadow_cube_size": shadow_cube_size,
        "shadow_cascade_size": shadow_cascade_size,
    },
    # "LEVEL 2 AN TOAN MO RONG" (quyet dinh Dy 23/07/2026, sau khi CHU DONG
    # doi lai ranh gioi da chot truoc do "Level 2 CHI bao cao, KHONG tu
    # dong"). CHI 5 muc duoc xac nhan la RUI RO THAP (khong doi ket qua
    # hinh anh CO Y NGHIA, hoac chi tac dong toi cac vung ANH HUONG RAT
    # NHO/HIEM GAP nhu Caustics) - KHONG bao gom Texture/Samples/Shadow/
    # Volumetric/Light giam manh (van CHI bao cao nhu truoc). 2 muc "gop
    # Instance tu dong" va "giam Bit depth 16->8" DA BI LOAI KHOI danh
    # sach nay theo phan bien cua Claude (rui ro/phuc tap hon 5 muc con
    # lai, Dy da dong y loai bo).
    "level2_safe_optimizations": {
        "disable_caustics": engine == "CYCLES",
            # Tat Caustics (Reflective+Refractive) - CHI co y nghia o
            # Cycles (EEVEE khong co khai niem nay). Luu y: nhieu scene
            # da TAT SAN Caustics tu truoc (mac dinh Blender co the la
            # tat), khi do buoc nay khong doi gi ca - VAN AN TOAN, chi la
            # khong tiet kiem duoc gi them trong truong hop do.
        "enable_camera_culling": True,
            # Ap dung cho CA 2 engine, nhung HANH VI KHAC NHAU: Cycles se
            # THAT SU bat use_camera_cull; EEVEE thi CHI IN LOG thong bao
            # (vi EEVEE da tu dong lam san, khong co cong tac rieng) -
            # xem apply_safe_optimizations_args() de biet chi tiet logic.
        "purge_orphan_data": True,
            # Don du lieu KHONG CON DUOC SU DUNG (anh/material/mesh mo
            # coi) truoc khi render - AN TOAN TUYET DOI, khong doi bat ky
            # gi trong ket qua render, chi giam dung luong file/bo nho.
        "clamp_indirect_light": engine == "CYCLES",
            # Clamp tia phan xa gian tiep (indirect) de giam fireflies/
            # noise - CHI Cycles. Gia tri clamp dat o muc RONG RAI (10)
            # de giam thieu rui ro thay doi hinh anh trong da so truong
            # hop (chi loai bo cac diem sang bat thuong, khong phai anh
            # sang binh thuong).
        "enable_simplify_eevee": True,
            # MOI (23/07/2026, sau khi Dy phan anh CWS chu yeu dung EEVEE
            # thay vi Cycles) - ap dung cho CA 2 engine qua
            # scene.render.use_simplify (setting cap Render, khong phai
            # cap Cycles rieng). Gom: giam child particles hien thi 15%
            # (KHONG PHAI an toan tuyet doi, co the anh huong toc/co/long
            # thu), VA giam Texture xuong toi da 2048px (2K) - **QUYET
            # DINH DAO NGUOC ranh gioi da chot 2 lan truoc trong cung
            # phien nay, Dy da xac nhan CHAC CHAN lan thu 3 muon Texture
            # TU DONG giam thay vi chi bao cao**. Day la thay doi CHAT
            # LUONG HINH ANH RO RET nhat trong Level 2 - BAT BUOC theo
            # doi log that sau trien khai.
        "enable_adaptive_subdivision": False,
            # TAM THOI TAT (False) - Adaptive Subdivision o Cycles doi hoi
            # bat Experimental feature set VA scene phai da dung
            # Subdivision Surface modifier voi "Adaptive Subdivision" tu
            # truoc - AP DUNG SAI CO THE THAY DOI HINH DANG mesh RO RET
            # (khac hoan toan ban chat voi cac muc tren, von chi anh huong
            # toi thoi gian render/do noise, KHONG doi hinh dang vat the).
            # De False (chua bat) cho toi khi co du lieu that xac nhan an
            # toan - GHI NHAN o day de khong quen, KHONG tu y bat len.
    },
}
print("CWS_ANALYZER_JSON_START")
print(json.dumps(report))
print("CWS_ANALYZER_JSON_END")
'''
    cmd = [str(BLENDER_EXE), "-b", str(blend_path), "--python-expr", analyzer_code]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        print("[SCENE ANALYZER] Qua thoi gian phan tich (timeout 120s) - bo qua, "
              "van tiep tuc render binh thuong.")
        return None

    # Trich JSON giua 2 dong danh dau - an toan hon parse toan bo stdout
    # (Blender in ra rat nhieu dong log khac truoc/sau khong lien quan).
    stdout = result.stdout
    try:
        start = stdout.index("CWS_ANALYZER_JSON_START") + len("CWS_ANALYZER_JSON_START")
        end = stdout.index("CWS_ANALYZER_JSON_END")
        report = json.loads(stdout[start:end].strip())
    except (ValueError, json.JSONDecodeError) as e:
        print(f"[SCENE ANALYZER] Khong doc duoc ket qua phan tich ({e}) - "
              f"bo qua, van tiep tuc render binh thuong.")
        return None

    return report


def get_or_create_optimization_plan(blend_path, job_id):
    """PHUONG AN C (de xuat 22/07/2026, sua lai 22/07/2026 theo phan bien
    cua Dy - tach bang rieng thay vi nhet vao jobs): chi 1 worker PHAN
    TICH thuc su, ket qua (Optimization Plan) duoc CHIA SE qua bang rieng
    job_optimization (KHONG PHAI cot trong jobs - tranh lam phinh bang
    jobs, de mo rong sau nay, giu duoc lich su), cac worker khac chi DOC.

    Luong: goi RPC set_optimization_plan_if_missing - RPC dung 'for
    update' (khoa hang) de dam bao ATOMIC: neu 2 worker cung goi gan nhu
    dong thoi, CHI worker nao toi truoc moi thuc su duoc luu Plan cua
    minh, worker den sau se nhan lai CHINH Plan da co san.

    Neu worker nay la nguoi DAU TIEN (chua co ban ghi trong
    job_optimization): no PHAI tu phan tich thuc su roi moi goi RPC de
    luu. Neu KHONG PHAI dau tien: doc thang tu bang, KHONG can tu phan
    tich (tiet kiem thoi gian, dung tinh than Phuong an C).

    Tra ve dict Plan hoac None neu ca phan tich lan RPC deu that bai
    (KHONG duoc chan worker render - day la tinh nang PHU)."""
    # Kiem tra truoc: co the Plan da co san tu worker khac (khong can tu
    # phan tich neu chi can DOC). Doc tu bang job_optimization rieng, KHONG
    # PHAI cot trong jobs (sua theo phan bien cua Dy 22/07/2026).
    #
    # SUA LOI QUAN TRONG (24/07/2026, ap dung checklist moi trong
    # CWS_AI_FIX_WORKFLOW.md - cau hoi 1 "du lieu cu co tuong thich voi
    # code moi khong?"): Plan da luu tren Supabase TU TRUOC KHI them
    # field "oversized_textures" (bo sung o ban 1.9.11) se KHONG co field
    # nay. Neu chi kiem tra "existing_plan is not None" nhu code cu, Plan
    # cu thieu field se van duoc chap nhan y nguyen - tinh nang resize
    # texture AM THAM khong bao gio chay (dung loi da xay ra that voi
    # Task 240/241/242, xac nhan qua Telegram alert lap lai deu dan +
    # khong thay dong [TEXTURE RESIZE] nao trong log). Fix: kiem tra RO
    # RANG field bat buoc co trong Plan doc duoc khong - neu THIEU, coi
    # Plan do la LOI THOI (khong du du lieu cho code hien tai), BO QUA no
    # va ep phan tich lai tu dau (ket qua phan tich moi se GHI DE Plan cu
    # qua RPC set_optimization_plan_if_missing - xem them RPC nay co
    # UPSERT/GHI DE hay chi "insert neu chua co", can xac nhan them neu
    # muon Plan moi thuc su thay the Plan cu tren Supabase).
    REQUIRED_PLAN_FIELDS = ("oversized_textures", "total_frames")
    url = f"{SUPABASE_URL}/rest/v1/job_optimization?job_id=eq.{job_id}&select=analysis"
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        if response.status_code < 400 and response.json():
            existing_plan = response.json()[0].get("analysis")
            if existing_plan is not None:
                missing_fields = [f for f in REQUIRED_PLAN_FIELDS if f not in existing_plan]
                if not missing_fields:
                    print("[OPTIMIZATION PLAN] Da co san tu worker khac - "
                          "doc lai, KHONG tu phan tich (tiet kiem thoi gian).")
                    return existing_plan
                else:
                    print(f"[OPTIMIZATION PLAN] Plan da co nhung LOI THOI "
                          f"(thieu field: {', '.join(missing_fields)} - Plan "
                          f"nay duoc tao boi ban worker cu hon truoc khi co "
                          f"field nay). BO QUA Plan cu, se tu phan tich lai "
                          f"de co day du du lieu cho ban hien tai.")
    except Exception:
        pass  # Loi mang - roi xuong duoi, van thu tu phan tich binh thuong


    # Chua co Plan (hoac khong kiem tra duoc) - worker nay TU PHAN TICH
    print("[OPTIMIZATION PLAN] Chua co san, dang tu phan tich file .blend...")
    my_report = analyze_blend_scene(blend_path)
    if my_report is None:
        print("[OPTIMIZATION PLAN DEBUG] analyze_blend_scene() tra ve None - "
              "phan tich that bai (xem log [SCENE ANALYZER] phia tren de biet ly do).")
        return None  # Phan tich that bai - khong co Plan, worker van render binh thuong

    # MOI (23/07/2026 chieu, DEBUG su co "job_optimization van trong du log
    # noi da phan tich thanh cong") - them log CHI TIET truoc/sau khi goi
    # RPC, boc trong try/except RIENG (khac voi try/except da co san trong
    # chinh rpc_call()) de bat CA loi bat ngo ngoai du kien (vd loi trong
    # json serialize p_plan truoc khi gui request) ma rpc_call() khong
    # bat duoc vi loi xay ra TRUOC khi request duoc gui di.
    print(f"[OPTIMIZATION PLAN DEBUG] Chuan bi goi RPC set_optimization_plan_if_missing "
          f"cho job_id={job_id!r}, kich thuoc du lieu report: {len(str(my_report))} ky tu.")
    try:
        final_plan = rpc_call("set_optimization_plan_if_missing", {
            "p_job_id": job_id,
            "p_plan": my_report,
        })
        print(f"[OPTIMIZATION PLAN DEBUG] Da goi RPC xong, ket qua final_plan la "
              f"{'None (that bai)' if final_plan is None else 'CO DU LIEU (thanh cong)'}.")
    except Exception as e:
        print(f"[OPTIMIZATION PLAN DEBUG] NEM EXCEPTION khi goi RPC (loi ma rpc_call() "
              f"KHONG tu bat duoc, vd loi serialize du lieu truoc khi gui): "
              f"{type(e).__name__}: {e}")
        final_plan = None

    if final_plan is None:
        # RPC loi (mang/Supabase down, hoac chua chay SQL tao bang/RPC) -
        # VAN dung ket qua TU phan tich cua chinh worker nay de ap dung
        # toi uu an toan, chi la khong luu duoc len Supabase cho worker
        # khac dung chung (khong sao, moi worker se tu phan tich rieng
        # neu RPC luon loi - suy thoai nhe ve hieu suat, KHONG mat tinh
        # dung dan).
        print("[OPTIMIZATION PLAN] LOI luu len Supabase (kiem tra da chay "
              "SQL tao bang job_optimization + RPC chua) - dung tam ket qua "
              "tu phan tich cua chinh worker nay.")
        return my_report

    return final_plan


def get_gpu_texture_reload_fix_code():
    """FIX BUG 'Failed to create GPU texture from Blender image' (them
    25/07/2026, sau khi dieu tra Task 405/406 tren Job CWS-JOB3 - xem Bien
    ban phien 25/07/2026 Phan 9 va nghien cuu forum chinh thuc Blender).

    NGUYEN NHAN (xac nhan qua Blender bug tracker #150756 va #115984, KHONG
    PHAI suy doan): day la bug DA BIET trong chinh Blender EEVEE ve cach
    quan ly bo nho GPU khi tai texture - xay ra NGAU NHIEN, KHONG lien quan
    VRAM con trong hay khong (da do thuc te tren Titan Station: tong
    texture chi ~2.2GB tren may 8GB VRAM, khong gan nguong). Mot don vi
    crowd render farm khac (issue #115984) xac nhan doc lap: 7 du an tu 7
    nguoi dung khac nhau trong 30 ngay deu gap DUNG loi nay - cho thay day
    la van de he thong cua Blender, khong phai loi rieng cua 1 file/may cu
    the.

    CACH FIX: bug report #150756 de xuat doi img.source qua 'SEQUENCE' roi
    doi lai 'FILE' de buoc Blender tai lai. Cach nay CHUA duoc xac nhan
    hoat dong voi anh packed_file=True (moi anh trong bug report goc deu la
    anh FILE roi tren dia, khac voi CWS - TOAN BO anh Titan Station la
    packed). Vi 'nguyen tac Tra cuu API chinh thuc truoc' (bai hoc tu that
    bai Pillow v1.9.11), o day dung CACH AN TOAN HON, xac nhan qua API
    chinh thuc (docs.blender.org/api/current/bpy.types.Image.html): ham
    gl_free() giai phong anh khoi bo nho GPU (khong dong voi 'source' cua
    anh, nen hoat dong nhu nhau voi CA packed va khong packed) - buoc
    Blender phai TU TAI LAI texture vao GPU o lan dung tiep theo, tu du
    lieu anh da co san trong RAM (dung cho ca truong hop packed).

    QUAN TRONG: day la fix THU NGHIEM, CHUA co benchmark truoc/sau de xac
    nhan hieu qua that (dung Phan 9.2 Bien ban 25/07 - "Xac nhan triet de
    tac dung bang benchmark truoc/sau"). Dy da xac nhan: THU truoc tren 1
    may, quan sat co giam tan suat loi 'Failed to create GPU texture'
    khong, ROI MOI day cho ca Fleet - KHONG tu dong day dai tra ngay.

    Chay VO DIEU KIEN, an toan tuyet doi (try/except, KHONG lam crash
    worker neu that bai) - giong pattern get_driver_namespace_fix_code()."""
    return (
        "try:\n"
        "    import bpy\n"
        "    _cws_reloaded = 0\n"
        "    for _cws_img in bpy.data.images:\n"
        "        try:\n"
        "            _cws_img.gl_free()\n"
        "            _cws_reloaded += 1\n"
        "        except Exception:\n"
        "            pass\n"
        "    print(f'[GPU TEXTURE FIX] Da giai phong {_cws_reloaded} anh khoi bo nho GPU '\n"
        "          f'(buoc Blender tai lai truoc khi render, thu nghiem fix loi '\n"
        "          f'Failed to create GPU texture).')\n"
        "except Exception as e:\n"
        "    print(f'[GPU TEXTURE FIX] Khong chay duoc: {e}')\n"
    )


def get_driver_namespace_fix_code():
    """FIX DRIVER NAMESPACE BI CHAN (bo sung 24/07/2026, sau su co Task 232
    Job CWS-JOB2 - driver dung noise.cell()/abs() bi Blender bao "restricted
    access disallows name 'cell'/'abs'"). NGUYEN NHAN THAT: day la 2 co bao
    mat KHAC NHAU cua Blender - --enable-autoexec chi cho phep script/driver
    DUOC CHAY, nhung danh sach TEN HAM duoc phep dung BEN TRONG bieu thuc
    driver la whitelist CUNG trong code Blender, KHONG co setting/co dong
    lenh nao mo rong duoc danh sach do truc tiep (xac nhan qua bug report
    chinh thuc #106372 cua Blender - "Isnt this all expected behavior?...
    Codewise, this is working as intended"). Cach o day KHONG "vuot qua"
    whitelist - ma dung dung co che CHINH THUC cua Blender (bpy.app.
    driver_namespace, xem Blender Manual > Animation > Drivers > Workflow &
    Examples) de dua noise/abs/lerp vao KHONG GIAN TEN rieng ma driver duoc
    phep truy cap, hoan toan hop le va an toan tuyet doi - KHONG doi hinh
    anh dau ra so voi truong hop driver chay dung nhu thiet ke goc (chi
    giup no CHAY DUOC thay vi bi chan).

    QUAN TRONG: ham nay TACH RIENG khoi apply_safe_optimizations_args() va
    LUON duoc goi VO DIEU KIEN (xem worker_loop), KHONG phu thuoc vao
    optimization_plan co ton tai hay khong - vi apply_safe_optimizations_args()
    return "" som neu plan=None (phan tich that bai), se lam mat luon fix
    nay neu nhet chung vao do."""
    return (
        "try:\n"
        "    import bpy\n"
        "    from mathutils import noise as _cws_noise\n"
        "    bpy.app.driver_namespace['noise'] = _cws_noise\n"
        "    bpy.app.driver_namespace['abs'] = abs\n"
        "    bpy.app.driver_namespace['lerp'] = lambda a, b, t: a + (b - a) * t\n"
        "    print('[DRIVER FIX] Da them noise/abs/lerp vao driver_namespace '\n"
        "          '- driver dung cac ham nay se chay duoc thay vi bi chan.')\n"
        "except Exception as e:\n"
        "    print(f'[DRIVER FIX] Khong them duoc driver_namespace: {e}')\n"
    )


def apply_safe_optimizations_args(plan):
    """Chuyen Optimization Plan thanh doan --python-expr de chen vao lenh
    Blender TRUOC khi render. Gom 2 nhom:
    1. 'safe_optimizations' (AN TOAN TUYET DOI - Adaptive Sampling/
       Persistent Data) - KHONG lam khac hinh anh dau ra, luon bat neu co.
    2. 'gentle_optimizations' (THAN TRONG - quyet dinh Dy 22/07/2026 lan
       2, ap dung TU DONG AM THAM khong bao khach): giam Samples toi da
       -15% VA giam Shadow Map DUNG 1 nac nho nhat trong thang co san.
       CO THE co sai khac cuc nho ve hinh anh (nhieu hat/do net shadow)
       nhung o muc chap nhan duoc.
    3. 'level2_safe_optimizations' (MOI, quyet dinh Dy 23/07/2026 - Dy
       CHU DONG doi lai ranh gioi da chot truoc do): 4 muc RUI RO THAP
       (Tat Caustics, Camera Culling, Purge Orphan Data, Clamp Indirect
       Light) - KHONG anh huong ro ret chat luong hinh anh (khac Shadow/
       Samples/Texture giam MANH, van CHI o muc bao cao nhu truoc, KHONG
       tu dong). Adaptive Subdivision GHI NHAN nhung CHUA BAT (rui ro
       thay doi hinh dang mesh, khac ban chat voi 4 muc con lai).

    Tra ve chuoi rong neu Plan khong co du lieu can thiet."""
    if not plan:
        return ""
    lines = []
    safe = plan.get("safe_optimizations", {})
    gentle = plan.get("gentle_optimizations", {})

    if safe.get("adaptive_sampling"):
        # Adaptive Sampling ton tai o ca Cycles va EEVEE Next, ten thuoc
        # tinh co the khac nhau giua engine - thu ca 2 nhanh, bo qua neu
        # engine hien tai khong ho tro (vd EEVEE Legacy khong co).
        lines.append(
            "try:\n"
            "    import bpy\n"
            "    s = bpy.context.scene\n"
            "    if s.render.engine == 'CYCLES':\n"
            "        s.cycles.use_adaptive_sampling = True\n"
            "    elif hasattr(s, 'eevee') and hasattr(s.eevee, 'use_taa_reprojection'):\n"
            "        pass  # EEVEE Next khong co adaptive sampling rieng, bo qua an toan\n"
            "except Exception as e:\n"
            "    print(f'[SAFE OPTIMIZE] Khong bat duoc Adaptive Sampling: {e}')\n"
        )
    if safe.get("persistent_data"):
        # SUA (24/07/2026): use_persistent_data la thuoc tinh CHUNG cua
        # scene.render (khong phai rieng cua cycles), nen ap dung duoc cho
        # CA EEVEE lan Cycles - truoc day code chi bat khi engine=='CYCLES'
        # nen EEVEE (dang la engine chinh CWS hay gap) bi bo lo toi uu nay
        # mot cach khong can thiet.
        lines.append(
            "try:\n"
            "    import bpy\n"
            "    s = bpy.context.scene\n"
            "    s.render.use_persistent_data = True\n"
            "except Exception as e:\n"
            "    print(f'[SAFE OPTIMIZE] Khong bat duoc Persistent Data: {e}')\n"
        )

    # ----- GENTLE: giam Samples toi da 15% -----
    reduce_pct = gentle.get("reduce_samples_percent", 0)
    if reduce_pct and plan.get("samples"):
        original_samples = plan["samples"]
        new_samples = max(1, int(original_samples * (100 - reduce_pct) / 100))
        lines.append(
            "try:\n"
            "    import bpy\n"
            "    s = bpy.context.scene\n"
            f"    new_samples = {new_samples}\n"
            "    if s.render.engine == 'CYCLES':\n"
            "        s.cycles.samples = new_samples\n"
            "    elif s.render.engine in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):\n"
            "        s.eevee.taa_render_samples = new_samples\n"
            f"    print(f'[GENTLE OPTIMIZE] Samples {original_samples} -> {{new_samples}} "
            f"(-{reduce_pct}%)')\n"
            "except Exception as e:\n"
            "    print(f'[GENTLE OPTIMIZE] Khong giam duoc Samples: {e}')\n"
        )

    # ----- GENTLE: giam Shadow Map dung 1 nac nho nhat (chi EEVEE) -----
    shadow_enum = gentle.get("shadow_size_enum", [])
    cube_size = gentle.get("shadow_cube_size")
    cascade_size = gentle.get("shadow_cascade_size")
    if shadow_enum and (cube_size in shadow_enum or cascade_size in shadow_enum):
        def one_notch_down(current):
            if current not in shadow_enum:
                return None
            idx = shadow_enum.index(current)
            return shadow_enum[idx - 1] if idx > 0 else current  # da o nac thap nhat, giu nguyen

        new_cube = one_notch_down(cube_size) if cube_size else None
        new_cascade = one_notch_down(cascade_size) if cascade_size else None
        set_lines = []
        if new_cube and new_cube != cube_size:
            set_lines.append(f"        s.eevee.shadow_cube_size = '{new_cube}'")
        if new_cascade and new_cascade != cascade_size:
            set_lines.append(f"        s.eevee.shadow_cascade_size = '{new_cascade}'")
        if set_lines:
            lines.append(
                "try:\n"
                "    import bpy\n"
                "    s = bpy.context.scene\n"
                "    if s.render.engine in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):\n"
                + "\n".join(set_lines) + "\n"
                f"    print('[GENTLE OPTIMIZE] Shadow Map giam 1 nac "
                f"({cube_size or cascade_size} -> {new_cube or new_cascade})')\n"
                "except Exception as e:\n"
                "    print(f'[GENTLE OPTIMIZE] Khong giam duoc Shadow Map: {e}')\n"
            )

    # ----- LEVEL 2 AN TOAN MO RONG (quyet dinh Dy 23/07/2026) - 4 muc
    # RUI RO THAP, KHONG anh huong ro ret chat luong hinh anh (khac han
    # Shadow/Samples/Texture giam manh, van CHI o muc bao cao). Chi ap
    # dung cho Cycles - EEVEE khong co cac khai niem Caustics/Camera
    # Culling/Clamp indirect nay. -----
    level2 = plan.get("level2_safe_optimizations", {})

    if level2.get("disable_caustics"):
        # Ten thuoc tinh CO THE khac nhau giua cac ban Blender (da xac
        # nhan qua nghien cuu: ban cu dung "caustics_reflective", tai
        # lieu ban moi hon co the doi ten) - THU CA 2 kha nang bang
        # hasattr(), KHONG doan mot ten duy nhat de tranh bo lo neu sai.
        lines.append(
            "try:\n"
            "    import bpy\n"
            "    s = bpy.context.scene\n"
            "    if s.render.engine == 'CYCLES':\n"
            "        c = s.cycles\n"
            "        for attr_pair in [('caustics_reflective', 'caustics_refractive'),\n"
            "                          ('use_caustics_reflective', 'use_caustics_refractive')]:\n"
            "            if hasattr(c, attr_pair[0]):\n"
            "                setattr(c, attr_pair[0], False)\n"
            "                setattr(c, attr_pair[1], False)\n"
            "                print(f'[LEVEL2 OPTIMIZE] Da tat Caustics qua thuoc tinh {attr_pair}')\n"
            "                break\n"
            "        else:\n"
            "            print('[LEVEL2 OPTIMIZE] Khong tim thay thuoc tinh Caustics phu hop "
            "(co the ban Blender nay dat ten khac) - bo qua an toan.')\n"
            "except Exception as e:\n"
            "    print(f'[LEVEL2 OPTIMIZE] Khong tat duoc Caustics: {e}')\n"
        )

    if level2.get("enable_camera_culling"):
        # QUAN TRONG (sua sau nghien cuu them 23/07/2026, Dy phan anh CWS
        # chu yeu dung EEVEE): Camera Culling qua Simplify menu (Cycles)
        # CHI co y nghia o Cycles - EEVEE da TU DONG lam dieu nay san (tai
        # toan bo scene vao bo nho nhung KHONG render phan ngoai khung
        # hinh), khong co cong tac rieng de "bat" - xac nhan qua nguon
        # thao luan cong dong Blender chinh thuc. Vi vay o EEVEE, KHONG
        # can code gi ca, chi ghi log de biet ro tinh trang.
        lines.append(
            "try:\n"
            "    import bpy\n"
            "    s = bpy.context.scene\n"
            "    if s.render.engine == 'CYCLES' and hasattr(s.cycles, 'use_camera_cull'):\n"
            "        s.cycles.use_camera_cull = True\n"
            "        print('[LEVEL2 OPTIMIZE] Da bat Camera Culling (Cycles)')\n"
            "    elif s.render.engine in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):\n"
            "        print('[LEVEL2 OPTIMIZE] EEVEE da tu dong Camera Culling san, "
            "khong can bat rieng.')\n"
            "    else:\n"
            "        print('[LEVEL2 OPTIMIZE] Khong tim thay use_camera_cull - bo qua an toan.')\n"
            "except Exception as e:\n"
            "    print(f'[LEVEL2 OPTIMIZE] Khong bat duoc Camera Culling: {e}')\n"
        )

    if level2.get("enable_simplify_eevee"):
        # MOI (sau nghien cuu 23/07/2026, dung cho CA Cycles va EEVEE vi
        # scene.render.use_simplify la setting CAP RENDER, KHONG PHAI cap
        # cycles - da xac nhan qua code thuc te BlenderProc). Gom 2 phan:
        #
        # (a) simplify_child_particles = 0.85 (giam 15%): KHONG PHAI "an
        # toan tuyet doi" - THAT SU giam so luong particle con hien thi,
        # co the anh huong toc/co/long thu neu scene co particle system
        # quan trong. Muc 0.85 (thay vi 0.5 de xuat ban dau) la thoa hiep
        # sau phan bien cua Claude, Dy da xac nhan.
        #
        # (b) simplify_texture_limit = '2048': **SUA LOI QUAN TRONG
        # (24/07/2026, sau su co Task 233 - "Failed to create GPU
        # texture" lap lai nhieu lan tren Goros Lair.blend, engine
        # EEVEE)**: comment cu ghi "ap dung ca Cycles va EEVEE" la SAI -
        # da xac nhan qua nghien cuu (Blender Developer Forum, code.
        # blender.org) rang scene.render.simplify_texture_limit CHI co
        # tac dung THAT SU voi Cycles. Voi EEVEE, thuoc tinh nay ton tai
        # (hasattr tra True) nhung KHONG lam giam bo nho GPU thuc te khi
        # render - day la "ao giac an toan": log in ra "da ap dung" trong
        # khi texture 8K van duoc nap nguyen ban vao GPU, dung nguyen
        # nhan gay loi Task 233. VAN GIU dong set thuoc tinh nay (khong
        # hai gi, co tac dung that voi Cycles), nhung KHONG con la co
        # che chinh giam texture cho EEVEE nua - viec giam THAT SU cho
        # EEVEE nay do resize_oversized_textures_in_blend() dam nhiem
        # (resize anh THAT bang bpy.image.scale() ben trong Blender,
        # ke ca anh packed - TRUOC khi goi Blender render - xem loi
        # goi ham o vong lap chinh).
        lines.append(
            "try:\n"
            "    import bpy\n"
            "    s = bpy.context.scene\n"
            "    s.render.use_simplify = True\n"
            "    if hasattr(s.render, 'simplify_child_particles'):\n"
            "        s.render.simplify_child_particles = 0.85\n"
            "    if hasattr(s.render, 'simplify_texture_limit'):\n"
            "        s.render.simplify_texture_limit = '2048'\n"
            "    print('[LEVEL2 OPTIMIZE] Da bat Simplify (child particles -15%, "
            "texture toi da 2048px cho Cycles - EEVEE dung resize file that rieng)')\n"
            "except Exception as e:\n"
            "    print(f'[LEVEL2 OPTIMIZE] Khong bat duoc Simplify: {e}')\n"
        )

    if level2.get("purge_orphan_data"):
        # An toan cho MOI engine (Cycles/EEVEE deu co) - chi don du lieu
        # khong con duoc tham chieu, KHONG doi ket qua render.
        lines.append(
            "try:\n"
            "    import bpy\n"
            "    bpy.ops.outliner.orphans_purge(do_recursive=True)\n"
            "    print('[LEVEL2 OPTIMIZE] Da purge orphan data (don du lieu khong dung)')\n"
            "except Exception as e:\n"
            "    print(f'[LEVEL2 OPTIMIZE] Khong purge duoc orphan data: {e}')\n"
        )

    if level2.get("clamp_indirect_light"):
        # Clamp o muc RONG RAI (10) - chi loai bo fireflies/diem sang bat
        # thuong, KHONG anh huong anh sang binh thuong cua scene. Gia tri
        # nay la UOC LUONG BAN DAU dua tren khuyen nghi chung cua nganh,
        # CHUA co du lieu that de tinh chinh rieng cho CWS.
        lines.append(
            "try:\n"
            "    import bpy\n"
            "    s = bpy.context.scene\n"
            "    if s.render.engine == 'CYCLES' and hasattr(s.cycles, 'sample_clamp_indirect'):\n"
            "        if s.cycles.sample_clamp_indirect == 0 or s.cycles.sample_clamp_indirect > 10:\n"
            "            s.cycles.sample_clamp_indirect = 10.0\n"
            "            print('[LEVEL2 OPTIMIZE] Da dat Clamp Indirect Light = 10 (giam fireflies)')\n"
            "        else:\n"
            "            print('[LEVEL2 OPTIMIZE] Clamp Indirect da o muc hop ly tu truoc, khong doi.')\n"
            "    else:\n"
            "        print('[LEVEL2 OPTIMIZE] Khong tim thay sample_clamp_indirect - bo qua an toan.')\n"
            "except Exception as e:\n"
            "    print(f'[LEVEL2 OPTIMIZE] Khong clamp duoc indirect light: {e}')\n"
        )

    # ----- Adaptive Subdivision: GHI NHAN nhung CHUA BAT (xem ly do trong
    # analyze_blend_scene() - co the thay doi hinh dang mesh ro ret, khac
    # ban chat voi 4 muc tren). KHONG viet code ap dung o day - de trong
    # co y, cho toi khi co quyet dinh rieng tu Dy. -----

    # ----- FIX "KHONG CO ANH SANG" (bo sung 24/07/2026, sau su co Task 232
    # Job CWS-JOB2 - file Goros Lair co 0 light, render ra anh den toan
    # phan). KHAC BAN CHAT voi moi optimization o tren: day KHONG PHAI toi
    # uu hieu nang (khong lam anh giong het ban goc) - day la SUA NOI DUNG
    # de file co the render ra ket qua DUNG DUOC thay vi anh den vo nghia.
    # Nguyen tac Dy chot 24/07/2026: "khach la nguon song, KHONG BAO GIO
    # huy job" - vi vay khi phat hien 0 light, TU DONG them 1 Sun Light +
    # World background nhe (giong setup mac dinh co ban nhat cua Blender)
    # thay vi de anh den hoac huy job. LUON in log ro rang day la anh sang
    # TU DONG THEM, KHONG PHAI thiet ke goc cua khach - de Dy/khach biet
    # ro khi xem lai ket qua.
    if plan.get("no_light_warning"):
        lines.append(
            "try:\n"
            "    import bpy\n"
            "    s = bpy.context.scene\n"
            "    print('=' * 60)\n"
            "    print('[AUTO-FIX ANH SANG] File KHONG CO nguon sang nao - '\n"
            "          'da TU DONG them Sun Light + World nen nhe de tranh '\n"
            "          'anh render ra DEN TOAN PHAN. Day KHONG PHAI thiet ke '\n"
            "          'goc cua khach - can bao lai khach truoc khi giao ket qua.')\n"
            "    print('=' * 60)\n"
            "    sun_data = bpy.data.lights.new(name='CWS_AutoFix_Sun', type='SUN')\n"
            "    sun_data.energy = 2.0\n"
            "    sun_obj = bpy.data.objects.new(name='CWS_AutoFix_Sun', object_data=sun_data)\n"
            "    sun_obj.rotation_euler = (0.785398, 0.0, 0.785398)\n"
            "    s.collection.objects.link(sun_obj)\n"
            "    if s.world is None:\n"
            "        s.world = bpy.data.worlds.new('CWS_AutoFix_World')\n"
            "    s.world.use_nodes = True\n"
            "    bg = s.world.node_tree.nodes.get('Background')\n"
            "    if bg:\n"
            "        bg.inputs['Color'].default_value = (0.4, 0.4, 0.4, 1.0)\n"
            "        bg.inputs['Strength'].default_value = 0.5\n"
            "    print('[AUTO-FIX ANH SANG] Da them xong: Sun Light (2.0W, 45 do) '\n"
            "          '+ World nen xam nhe (Strength 0.5).')\n"
            "except Exception as e:\n"
            "    print(f'[AUTO-FIX ANH SANG] LOI khi them anh sang tu dong: {e}')\n"
        )

    return "\n".join(lines)


LEVEL_SUGGESTIONS = {
    0: "Khong can toi uu. Giu nguyen cau hinh goc.",
    1: "Level 1 (An toan): co the bo texture/light trung lap, bat Persistent "
       "Data, Adaptive Sampling. Khach kho nhan ra khac biet.",
    2: "Level 2 (Can bang): 4 muc rui ro thap (Caustics/Camera Culling/"
       "Purge/Clamp) VA Simplify (child particles -15%, Texture toi da "
       "2048px/2K) DA TU DONG ap dung (quyet dinh Dy 23/07/2026 - Texture "
       "DA CHUYEN sang tu dong, KHONG CON chi bao cao nhu truoc). Giam "
       "Shadow resolution/Samples THEM (ngoai Gentle da co) van CHI o muc "
       "bao cao, CAN Dy xac nhan truoc neu muon ap dung them.",
    3: "Level 3 (Manh - CAN HOI KHACH TRUOC AP DUNG): giam Volumetric, "
       "Reflection, giam them Shadow/Samples. Anh huong ro ret chat "
       "luong hinh anh.",
}


def print_scene_analysis_report(report, job_id):
    """In bao cao phan tich ra man hinh (log). Level 2-3 manh (shadow/
    texture/volumetric giam THEM ngoai Gentle) CHI la bao cao/goi y,
    worker KHONG tu sua. Cac muc DA TU DONG (Safe/Gentle/Level 2 an toan
    mo rong/Simplify) duoc THUC THI RIENG (xem apply_safe_optimizations_
    args, goi trong worker_loop) - ham nay chi lo phan HIEN THI.

    SUA (23/07/2026 dem, theo yeu cau Dy - bo dong 'LUU Y' gay hieu lam
    lan 2 trong ngay): thay vi giai thich CACH DOC log, in THANG ra
    DANH SACH CU THE cac muc SE duoc tu dong ap dung cho scene nay VA
    LOI ICH cua tung muc - tra loi truc tiep "da toi uu nhung gi" thay
    vi bat nguoi doc phai tu doi xem log Blender phia sau."""
    if report is None:
        return
    level = report["suggested_level"]
    engine = report.get("engine", "")
    level2 = report.get("level2_safe_optimizations", {})

    print("\n" + "=" * 60)
    print(f"[SCENE ANALYZER] Bao cao phan tich file .blend (Job {job_id})")
    print("=" * 60)
    # TONG SO FRAME (them 26/07/2026) - in DAU TIEN, DE THAY NHAT, vi day
    # la thong tin Dy can nhat de biet tao bao nhieu task con lai cho job.
    if report.get("total_frames") is not None:
        print(f"*** TONG SO FRAME: {report['total_frames']} "
              f"(frame_start={report.get('frame_start')}, "
              f"frame_end={report.get('frame_end')}, "
              f"frame_step={report.get('frame_step')}) ***")
    print(f"Render Engine: {report['engine']}")
    print(f"Light: {report['total_lights']} tong, {report['shadow_lights']} co shadow")
    print(f"Polygon: {report['polygon_count']:,}")
    print(f"Texture toi da: {report['max_texture_res']}px ({report['texture_count']} anh)")
    if report.get("samples") is not None:
        print(f"Samples: {report['samples']}")

    # ===== SCENE PROFILE v1 (them 25/07/2026) - CHI BAO CAO, KHONG SUA =====
    profile = report.get("scene_profile_v1")
    if profile:
        print("\n" + "-" * 60)
        print("[SCENE PROFILE v1] Do du lieu 5 nhom tai nguyen (CHI DOC)")
        print("-" * 60)

        # 1. VOLUME - nhom nghi la nang nhat
        vol_objs = profile.get("volume_objects") or []
        vol_mats = profile.get("volume_shader_materials") or []
        world_vol = profile.get("world_has_volume")
        if vol_objs or vol_mats or world_vol:
            print(f"VOLUME: {len(vol_objs)} object, {len(vol_mats)} material, "
                  f"World volume: {'CO' if world_vol else 'khong'}")
            for name, grids in vol_objs[:5]:
                print(f"    - Volume object '{name}' ({grids} grid)")
            for mat_name in vol_mats[:5]:
                print(f"    - Material co Volume shader: '{mat_name}'")
        else:
            print("VOLUME: khong co (tot - day la nhom nang nhat)")

        # 2. GEOMETRY NODES
        geo_objs = profile.get("geo_nodes_objects") or []
        if geo_objs:
            print(f"GEOMETRY NODES: {len(geo_objs)} object, tong "
                  f"{profile.get('geo_nodes_total_node_count', 0)} node")
            for obj_name, ng_name, node_count in geo_objs[:5]:
                print(f"    - '{obj_name}' dung node group '{ng_name}' ({node_count} node)")
        else:
            print("GEOMETRY NODES: khong co")

        # 3. PARTICLE / HAIR
        psys_list = profile.get("particle_systems") or []
        if psys_list:
            print(f"PARTICLE/HAIR: {len(psys_list)} he thong, tong ~"
                  f"{profile.get('particle_total_count', 0):,} hat/soi")
            for obj_name, psys_name, ptype, count, child in psys_list[:5]:
                print(f"    - '{obj_name}' / '{psys_name}' ({ptype}): "
                      f"{count:,} hat + {child:,} child")
        else:
            print("PARTICLE/HAIR: khong co")

        # 4. SUBDIVISION
        subdiv = profile.get("subdiv_objects") or []
        if subdiv:
            print(f"SUBDIVISION: {len(subdiv)} object, cap toi da "
                  f"{profile.get('subdiv_max_render_level', 0)}, uoc tinh "
                  f"~{profile.get('subdiv_total_est_polys', 0):,} poly sau subdivide")
            for obj_name, view_lv, render_lv, base_p, est_p in subdiv[:5]:
                print(f"    - '{obj_name}': view={view_lv}, render={render_lv}, "
                      f"{base_p:,} -> ~{est_p:,} poly")
        else:
            print("SUBDIVISION: khong co")

        # 5. MODIFIER
        mod_summary = profile.get("modifier_summary") or {}
        mod_heavy = profile.get("modifier_heavy_objects") or []
        if mod_summary:
            top_mods = sorted(mod_summary.items(), key=lambda x: -x[1])[:5]
            print("MODIFIER: " + ", ".join(f"{t}={c}" for t, c in top_mods))
            if mod_heavy:
                print(f"    - {len(mod_heavy)} object co modifier NANG chua apply")
        else:
            print("MODIFIER: khong co")

        print("-" * 60)
        print("GHI CHU: day la GIAI DOAN 1 (chi do du lieu, KHONG tu dong sua "
              "gi). Muc dich: thu thap so lieu that tu nhieu file khach de "
              "biet nhom nao THUC SU nang, truoc khi quyet dinh xay tinh nang "
              "toi uu cho nhom do.")
        print("LUU Y QUAN TRONG (nghien cuu 25/07/2026): voi EEVEE, giam "
              "texture chu yeu giup TRANH CRASH VRAM, KHONG giam dang ke thoi "
              "gian render. Thu lam CHAM render EEVEE that su la Volume, "
              "Shadow do phan giai cao, Samples va so luong instance/particle.")
        print("-" * 60)

    if report.get("no_light_warning"):
        print("\n" + "!" * 60)
        print("!!! CANH BAO NGHIEM TRONG - FILE KHONG CO ANH SANG !!!")
        print("!" * 60)
        print(f"    {report['no_light_warning']}")
        print("    ==> Nen bao lai khach truoc khi tiep tuc render toan bo job,")
        print("        tranh ton tai nguyen cho ket qua chac chan vo nghia.")
        print("!" * 60)
    print(f"\n>>> MUC DE XUAT: Level {level}")
    for r in report["reasons"]:
        print(f"    - {r}")

    print("\n>>> DA TOI UU (tu dong ap dung cho scene nay, loi ich cu the):")
    applied_any = False

    print("    - Adaptive Sampling + Persistent Data")
    print("      Loi ich: giam so mau (samples) can tinh o vung da du muot, "
          "tai su dung du lieu scene giua cac frame - giam thoi gian render, "
          "KHONG doi hinh anh dau ra.")
    applied_any = True

    gentle = report.get("gentle_optimizations", {})
    if gentle.get("reduce_samples_percent"):
        print(f"    - Giam Samples {gentle['reduce_samples_percent']}% "
              f"({report.get('samples')} -> gia tri thap hon)")
        print("      Loi ich: giam thoi gian render ty le thuan voi % giam, "
              "sai khac hinh anh RAT NHO (kho nhan ra bang mat thuong).")
        applied_any = True
    if gentle.get("shadow_cube_size") or gentle.get("shadow_cascade_size"):
        print("    - Giam Shadow Map 1 nac (vd 1024 -> 512)")
        print("      Loi ich: giam bo nho GPU va thoi gian tinh shadow, "
              "sai khac RAT NHO o chi tiet bong do net.")
        applied_any = True

    if level2.get("disable_caustics") and engine == "CYCLES":
        print("    - Tat Caustics (Reflective + Refractive)")
        print("      Loi ich: giam thoi gian render VA giam noise/hat trong anh "
              "(Caustics la hieu ung ton kem tinh toan, it khi anh huong ro ret "
              "toi bo cuc hinh anh cuoi cung).")
        applied_any = True
    if level2.get("enable_camera_culling"):
        if engine == "CYCLES":
            print("    - Bat Camera Culling")
            print("      Loi ich: bo qua tinh toan cho vat the ngoai khung hinh "
                  "camera - giam thoi gian render dang ke voi scene lon.")
        else:
            print("    - Camera Culling: EEVEE da tu dong lam san (khong can bat rieng)")
        applied_any = True
    if level2.get("purge_orphan_data"):
        print("    - Purge Orphan Data (don du lieu khong con dung)")
        print("      Loi ich: giam dung luong bo nho/file, KHONG anh huong "
              "ket qua render.")
        applied_any = True
    if level2.get("clamp_indirect_light") and engine == "CYCLES":
        print("    - Clamp Indirect Light = 10")
        print("      Loi ich: loai bo cac diem sang bat thuong (fireflies), "
              "giam noise ma khong doi anh sang binh thuong cua scene.")
        applied_any = True
    if level2.get("enable_simplify_eevee"):
        print("    - Simplify: giam Child Particles hien thi con 85% + "
              "Texture toi da 2048px (2K)")
        print("      Loi ich: giam thoi gian render voi scene nhieu particle "
              "(toc/co/long thu) va texture do phan giai cao - Texture giam "
              "co the anh huong nhe toi do net chi tiet be mat, particle "
              "giam anh huong nhe toi mat do (o muc kho nhan ra o phan lon "
              "truong hop).")
        applied_any = True

    if not applied_any:
        print("    (Khong co muc nao ap dung duoc cho scene/engine nay)")

    print("\n>>> Level 2-3 MANH HON (giam THEM Shadow/Samples/Volumetric/Light) "
          "van CHI o muc goi y, CAN Dy xac nhan truoc neu muon ap dung:")
    print(f"    {LEVEL_SUGGESTIONS[level]}")
    print("=" * 60 + "\n")


def get_job_info(job_id):
    url = f"{SUPABASE_URL}/rest/v1/jobs?id=eq.{job_id}&select=blend_link,blend_file"
    response = requests.get(url, headers=HEADERS, timeout=15)
    if response.status_code >= 400 or not response.json():
        return None
    return response.json()[0]


def register_worker(worker_id, fleet_id, gpu_name, vram_mb):
    """Goi 1 LAN LUC KHOI DONG - dang ky worker vao bang `workers` (schema
    09_setup_fleet_capacity.sql). Neu KHONG goi ham nay, bang workers se
    MAI MAI rong du schema da san sang - day la ly do Capacity Management
    khong co du lieu that du da chay xong SQL tu truoc (phat hien 22/07/2026).
    Best-effort: neu loi (vd fleet_id sai, mat mang), CHI in canh bao,
    KHONG duoc chan worker hoat dong vi day la tinh nang phu tro Fleet,
    khong phai logic render cot loi."""
    try:
        rpc_call("register_worker", {
            "p_worker_id": worker_id,
            "p_fleet_id": fleet_id,
            "p_gpu_name": gpu_name,
            "p_vram_mb": vram_mb,
        })
        print(f"[fleet] Da dang ky worker {worker_id} vao fleet_id={fleet_id}")
    except Exception as e:
        print(f"[fleet] CANH BAO: dang ky worker that bai ({e}) - "
              f"van tiep tuc render binh thuong, chi anh huong Capacity Management.")


def worker_ping(worker_id):
    """Goi DINH KY (ca luc dang ranh lan dang render) de bao 'toi con song'
    vao cot workers.last_seen_at - KHAC voi report_heartbeat (chi bao con
    song cho 1 TASK cu the dang lam). Neu khong co ham nay, worker dang
    RANH cho task se KHONG BAO GIO duoc dem vao Capacity vi no chua tung
    goi RPC nao lien quan toi workers ngoai luc khoi dong. Best-effort,
    khong chan luong chinh neu loi."""
    try:
        rpc_call("worker_ping", {"p_worker_id": worker_id})
    except Exception:
        pass  # ping that bai khong quan trong bang viec worker tiep tuc chay


# ---------------------------------------------------------------------
# VONG LAP CHINH
# ---------------------------------------------------------------------
def _load_job_context(job_id, _cache={}):
    """Chuan bi day du thong tin can thiet cho 1 job (blend_path,
    optimization_code, ten file de log) - TACH RIENG (25/07/2026, phuc vu
    Job 4 - 6 file .blend khac nhau) khoi worker_loop() de co the goi LAI
    NHIEU LAN khi worker doi qua job khac, thay vi chi chay 1 lan duy nhat
    luc khoi dong nhu truoc (gia dinh cu: ca doi worker chi lam 1 job).

    CACHE theo job_id (dict mac dinh _cache, ben vung qua nhieu lan goi
    trong cung 1 tien trinh Python) - neu worker quay lai DUNG job da lam
    truoc do (rat pho bien khi random chon lai trung job cu), KHONG tai
    lai file .blend/phan tich lai tu dau, chi dung lai ket qua da co - vi
    ensure_blend_file() da tu kiem tra file ton tai roi moi tai, va
    get_or_create_optimization_plan() da tu doc lai tu Supabase neu da co
    san, nen cache o day CHU YEU tiet kiem 1-2 lan goi RPC/doc dia thua,
    khong phai tranh ton tai du lieu sai.

    Tra ve None neu job khong ton tai tren Supabase (loi that, khong phai
    tam thoi) - worker_loop se bo qua job nay, thu job khac trong danh sach."""
    if job_id in _cache:
        return _cache[job_id]

    job_info = get_job_info(job_id)
    if job_info is None:
        print(f"[CANH BAO] Khong tim thay job {job_id} tren Supabase - bo qua.")
        return None

    blend_path = ensure_blend_file(job_info["blend_link"], job_info["blend_file"])
    optimization_plan = get_or_create_optimization_plan(blend_path, job_id)
    print_scene_analysis_report(optimization_plan, job_id)

    optimization_code = get_driver_namespace_fix_code() + apply_safe_optimizations_args(optimization_plan)
    if ENABLE_GPU_TEXTURE_RELOAD_FIX:
        optimization_code += get_gpu_texture_reload_fix_code()

    ctx = {
        "blend_path": blend_path,
        "optimization_code": optimization_code,
        "blend_file": job_info["blend_file"],
    }
    _cache[job_id] = ctx
    return ctx


def worker_loop():
    ensure_blender_installed()
    worker_id = get_worker_id()
    worker_vram_mb = get_worker_vram_mb()  # Lay 1 lan luc khoi dong (may khong doi GPU giua chung)

    print(f"CWS Worker (FULL) khoi dong - Worker ID: {worker_id}")
    print("Che do: ZERO MANUAL WORKER - tu dong polling toan bo Queue")
    print(f"Thu muc lam viec (CWS_DIR): {BASE_DIR}")
    if "CWS_DIR" not in os.environ:
        print("[CANH BAO] Bien moi truong CWS_DIR KHONG duoc set - dang dung "
              "fallback mac dinh. Neu chay qua cws_worker.bat ma thay canh bao "
              "nay, kiem tra lai .bat co dong set CWS_DIR=... truoc khi goi "
              "python.exe khong.")
    print("=" * 60)

    register_worker(worker_id, FLEET_ID, gpu_name=None, vram_mb=worker_vram_mb)

    while True:
        # ZERO MANUAL WORKER (1.16.5): goi 1 RPC duy nhat, Supabase tu chon
        # task co priority cao nhat trong TOAN BO Queue.
        # Worker khong biet va khong can biet job_id nao dang ton tai.
        task, current_job_id = claim_next_task(worker_id, worker_vram_mb)

        if task is None:
            print(f"\nKhong con task nao. Doi {POLL_INTERVAL_SEC}s roi hoi lai...")
            worker_ping(worker_id)
            if check_for_newer_version():
                apply_update_jitter_and_exit("dang ranh, khong co task de claim")
                return

            # ----- REMOTE SHUTDOWN: kiem tra NGAY LUC DANG RANH - day la
            # DIEM QUAN TRONG NHAT vi da 3 diem goi Auto Update thi nhanh
            # "dang ranh" la nhanh DUY NHAT chac chan duoc goi lien tuc khi
            # Fleet khong con task (moi may deu idle) - 2 diem con lai (giua
            # task, vua xong task) se KHONG BAO GIO chay toi neu khong co
            # task nao dang render. Xoa 3 dong nay + ham
            # check_remote_shutdown_command() la go bo sach tinh nang. -----
            if check_remote_shutdown_command(worker_id, worker_vram_mb):
                print("[remote_shutdown] Nhan lenh shutdown tu xa - may nay dang "
                      "ranh, TAT an toan ngay.")
                os.system('shutdown /s /t 60 /c "CWS: shutdown theo lenh tu xa tu Dy"')
                return

            time.sleep(POLL_INTERVAL_SEC)
            continue

        task_id = task["task_id"]
        frame_start = task["out_frame_start"]
        frame_end = task["out_frame_end"]
        generation = task["out_generation"]

        worker_ping(worker_id)  # Bao con song ngay khi VUA nhan task

        # LOAD JOB CONTEXT (25/07/2026, Job 4): tai blend_path/optimization_code
        # DUNG CHO JOB VUA CLAIM DUOC (co the KHAC job lan truoc, vi random
        # thu tu moi vong) - xem docstring _load_job_context() de biet co che
        # cache tranh tai lai khong can thiet neu trung job cu.
        job_ctx = _load_job_context(current_job_id)
        if job_ctx is None:
            # Job nay loi that (khong ton tai tren Supabase) - tra lai task
            # bang fail_task (transient, de worker khac/lan sau thu lai) roi
            # thu job khac ngay, khong dung ca worker lai vi 1 job loi.
            print(f"[LOI] Khong the tai job context cho {current_job_id} - "
                  f"tra lai task {task_id}, thu job khac.")
            fail_task(task_id, generation, worker_id, "transient")
            continue
        blend_path = job_ctx["blend_path"]
        optimization_code = job_ctx["optimization_code"]

        print(f"\n[NHAN VIEC] Job {current_job_id} - Task {task_id}: frame "
              f"{frame_start}-{frame_end} (generation={generation})")
        log_task_event(task_id, worker_id, f"Nhan viec, dang render frame {frame_start}-{frame_end}")

        # HEARTBEAT THREAD (khoi phuc 25/07/2026): BAT BUOC phai chay suot
        # thoi gian lam task, neu khong requeue_stale_tasks() ben Supabase se
        # cuop task sau 240s (xem ghi chu day du tai HEARTBEAT_INTERVAL_SEC).
        stop_event = threading.Event()
        hb_thread = threading.Thread(
            target=heartbeat_loop,
            args=(task_id, generation, worker_id, stop_event),
            daemon=True
        )
        hb_thread.start()

        output_dir = WORK_DIR / f"output_task_{task_id}"

        # ----- INCREMENTAL RECOVERY (them 22/07/2026 dem, thiet ke chot
        # trong CWS_ThietKe_GC_va_IncrementalRecovery_v2.md) - goi DUNG 1
        # LAN moi khi vua nhan task, TRUOC vong lap render. Neu day la task
        # da tung bi requeue (worker truoc do bi mat lien lac giua chung,
        # da checkpoint 1 vai frame len B2 truoc khi mat), worker nay se
        # biet ngay khong can render lai tu dau. -----
        existing_frames_on_b2 = get_existing_frames_on_b2(current_job_id, task_id)
        if existing_frames_on_b2:
            print(f"[RECOVERY] Task {task_id}: phat hien {len(existing_frames_on_b2)} "
                  f"frame co the da co san tren B2 tu lan requeue truoc - se kiem tra "
                  f"lai tung frame truoc khi quyet dinh bo qua hay render lai.")

        # ----- CHECKPOINT PER-FRAME (yeu cau Dy 22/07/2026) -----
        # Thay vi render CA task (2-5 frame theo Dynamic Chunk Size) roi moi
        # upload 1 lan, giờ render + upload NGAY TUNG FRAME MOT. Neu may
        # crash/mat dien giua chung, CHI mat frame DANG render dang do -
        # cac frame TRUOC DO trong cung task da upload len B2 an toan roi.
        # Danh doi: tang so lan khoi dong Blender (them ~1-2s/frame overhead)
        # de doi lay giam "ban kinh no" khi mat may giua chung.
        uploaded_frames = []
        seconds_per_frame_list = []
        error_category = None

        for frame_num in range(frame_start, frame_end + 1):
            # ----- INCREMENTAL RECOVERY: neu frame nay CO THE da co san
            # tren B2 (tu lan requeue truoc), kiem tra lai TRUOC KHI render -
            # neu hop le, bo qua render, dung lai ban cu. -----
            if frame_num in existing_frames_on_b2:
                recovered_file = validate_existing_frame_on_b2(
                    current_job_id, task_id, frame_num, output_dir
                )
                if recovered_file is not None:
                    uploaded_frames.append(recovered_file)
                    log_task_event(task_id, worker_id,
                                  f"Recovery: frame {frame_num} da co san tren B2 tu truoc, "
                                  f"bo qua render")
                    continue  # sang frame tiep theo, KHONG render frame nay

            frame_file, frame_error, frame_seconds = render_single_frame(
                blend_path, frame_num, output_dir,
                optimization_code=optimization_code, task_id=task_id
            )

            if frame_file is None:
                # Frame nay loi - dung lai NGAY, KHONG render tiep cac frame
                # con lai trong task (an toan hon: neu 1 frame loi vi ly do
                # persistent/permanent, cac frame sau trong CUNG scene co
                # kha nang cao cung loi tuong tu - dung phi thoi gian render
                # tiep roi van phai fail ca task).
                error_category = frame_error
                print(f"[LOI] Task {task_id} dung lai o frame {frame_num} "
                      f"(phan loai: {error_category}). Da upload duoc "
                      f"{len(uploaded_frames)}/{frame_end - frame_start + 1} frame truoc do.")
                break

            upload_ok = upload_single_frame(frame_file, current_job_id, task_id)
            if not upload_ok:
                # Upload that bai - COI LA TRANSIENT (thuong la mang chap
                # chon), dung lai, KHONG tiep tuc render frame sau vi frame
                # hien tai chua chac chan da luu an toan tren B2.
                error_category = "transient"
                print(f"[LOI] Task {task_id} upload that bai o frame {frame_num}. "
                      f"Da upload duoc {len(uploaded_frames)}/"
                      f"{frame_end - frame_start + 1} frame truoc do.")
                break

            uploaded_frames.append(frame_file)
            if frame_seconds is not None:
                seconds_per_frame_list.append(frame_seconds)
            log_task_event(task_id, worker_id,
                          f"Checkpoint: frame {frame_num} da render + upload B2 thanh cong")

            # ----- MOI (23/07/2026, "Huong 1" - Auto Update GIUA TASK):
            # truoc day chi kiem tra update luc RANH hoac VUA XONG CA
            # TASK (2-5 frame) - neu dang lam dua chung 1 task, phai doi
            # het CA task moi duoc update, co the mat vai phut. Gio kiem
            # tra NGAY SAU MOI FRAME checkpoint xong (frame da an toan
            # tren B2 roi) - neu phat hien ban moi, DUNG LAI GIUA TASK,
            # KHONG render tiep cac frame con lai, chu dong "nhuong" phan
            # con lai cho may khac bang fail_task loai 'transient' (GIONG
            # HET co che xu ly loi mang tam thoi da co san - KHONG PHAI
            # loi that, se KHONG tinh vao failed_by/thong ke loi cua job).
            # Nho Incremental Recovery (da co tu v1.8.0), may TIEP THEO
            # nhan lai task nay se TU phat hien cac frame da checkpoint
            # (bao gom frame VUA xong o day), KHONG render lai tu dau. -----
            if frame_num < frame_end and check_for_newer_version():
                print(f"[update] Phat hien ban moi hon {WORKER_VERSION} NGAY GIUA "
                      f"task {task_id} (vua xong frame {frame_num}/{frame_end}) - "
                      f"CHU DONG dung lai, nhuong phan con lai cho may khac (transient, "
                      f"KHONG tinh la loi that) de som update len ban moi.")
                stop_event.set()  # dung heartbeat truoc khi thoat
                fail_task(task_id, generation, worker_id, "transient")
                apply_update_jitter_and_exit(f"dung giua task {task_id} de nhuong viec")
                return

        # DUNG HEARTBEAT: task nay da render xong (hoac dung vi loi) - phai
        # dung thread heartbeat NGAY, tranh no tiep tuc bao cho task/generation
        # CU sang task tiep theo (se gay sai lech du lieu tren Supabase).
        stop_event.set()

        seconds_per_frame = (
            sum(seconds_per_frame_list) / len(seconds_per_frame_list)
            if seconds_per_frame_list else None
        )

        if not uploaded_frames:
            # KHONG co frame nao thanh cong (loi ngay tu frame dau tien cua task)
            print(f"[LOI] Task {task_id} khong render duoc frame nao "
                  f"(phan loai: {error_category}).")
            log_task_event(task_id, worker_id, f"LOI render: {error_category}")
            fail_result = fail_task(task_id, generation, worker_id, error_category or "persistent")
            if fail_result == "requeued":
                print(f"[FAIL_TASK] Task {task_id} da requeue, se duoc thu lai "
                      f"(tren may khac neu la persistent).")
            elif fail_result == "permanent":
                print(f"[FAIL_TASK] Task {task_id} da chuyen PERMANENT - "
                      f"can Dy kiem tra thu cong (loi lap lai tren nhieu may).")
            elif fail_result == "rejected":
                print(f"[FAIL_TASK] Task {task_id} bao loi bi tu choi - "
                      f"da bi giao cho worker khac tu truoc.")
            else:
                print("[FAIL_TASK] LOI: khong goi duoc fail_task, kiem tra ket noi Supabase.")
            continue

        # Bao toc do render cho he thong Dynamic Chunk Size (Chuong 8).
        if seconds_per_frame is not None:
            tasks_created = report_render_speed(current_job_id, seconds_per_frame)
            if tasks_created is not None and tasks_created > 0:
                print(f"[CHUNK] Da do toc do {seconds_per_frame:.1f} giay/frame, "
                      f"tu dong tao {tasks_created} task con lai.")

        expected_count = frame_end - frame_start + 1
        if len(uploaded_frames) < expected_count:
            # Mot phan frame trong task loi giua chung (da upload duoc mot
            # so frame, nhung KHONG DU het task) - fail_task VAN duoc goi de
            # phan con lai (frame chua render) duoc requeue cho may khac.
            # Luu y: cac frame DA upload van an toan tren B2 - KHONG mat, VA
            # KHONG bi render lai vo ich nua (Incremental Recovery da trien
            # khai 22/07/2026 dem - xem get_existing_frames_on_b2() o tren) -
            # worker TIEP THEO nhan lai task nay se tu phat hien va bo qua
            # cac frame da co san, chi render phan con thieu.
            print(f"[MOT PHAN] Task {task_id} chi hoan thanh {len(uploaded_frames)}/"
                  f"{expected_count} frame truoc khi gap loi. Se fail_task de "
                  f"phan con lai duoc requeue (frame da xong VAN AN TOAN tren B2).")
            log_task_event(task_id, worker_id,
                          f"MOT PHAN: {len(uploaded_frames)}/{expected_count} frame xong, "
                          f"con lai se requeue")
            fail_result = fail_task(task_id, generation, worker_id, error_category or "transient")
            print(f"[FAIL_TASK] Task {task_id} bao loi mot phan: {fail_result}")
            continue

        ok = complete_task(task_id, generation, worker_id)
        if ok:
            print(f"[HOAN THANH] Task {task_id} da render + upload B2 + ghi nhan thanh cong.")
            log_task_event(task_id, worker_id, "Hoan thanh: render + upload B2 thanh cong")
        else:
            print(f"[BI TU CHOI] Task {task_id} - da bi requeue cho worker khac giua chung.")

        # ----- REMOTE SHUTDOWN: dat SAU Auto Update ben duoi (xem giai
        # thich thu tu o nhanh "dang ranh") - Auto Update chay truoc de
        # worker luon co co hoi tu lanh, shutdown chi chay khi da o ban
        # moi nhat. Tach biet hoan toan voi Auto Update - xoa khoi nay +
        # ham check_remote_shutdown_command() la go bo sach tinh nang. -----
        # ----- TU KIEM TRA BAN MOI, DIEM THU 2 (bo sung 22/07/2026 toi):
        # kiem tra o nhanh "task is None" (dang ranh) o tren KHONG DU - neu
        # Fleet luon co viec lien tuc (task khong bao gio None), worker se
        # KHONG BAO GIO chay toi nhanh do, bo sot viec kiem tra ban moi vo
        # thoi han. Day la diem an toan thu 2: NGAY SAU KHI 1 task vua xong
        # han (da complete_task/bi tu choi xong), TRUOC KHI vong lap quay
        # lai claim_task tiep theo - ranh gioi tu nhien giua 2 task, KHONG
        # lam gian doan checkpoint per-frame nao dang render do dang. -----
        if check_for_newer_version():
            apply_update_jitter_and_exit("vua xong 1 task")
            return

        if check_remote_shutdown_command(worker_id, worker_vram_mb):
            print("[remote_shutdown] Nhan lenh shutdown tu xa - may nay se TAT "
                  "an toan (da xong task, khong cat ngang render nao).")
            stop_event.set()
            os.system('shutdown /s /t 60 /c "CWS: shutdown theo lenh tu xa tu Dy"')
            return


if __name__ == "__main__":
    print(f"[version] CWS Worker phien ban {WORKER_VERSION}")
    try:
        worker_loop()
    except KeyboardInterrupt:
        print("\n\nWorker da dung theo yeu cau (Ctrl+C).")
        sys.exit(0)
    except Exception as e:
        # Loi khong luong truoc (crash that su) - KHAC voi KeyboardInterrupt
        # (nguoi dung chu dong dung). Bao ve Supabase truoc khi thoat de Dy
        # xem duoc tu xa (bang workers.last_crash_message) khong can vao
        # tung may doc log. cws_worker.bat (lop vo ngoai) se tu dong khoi
        # dong lai worker nay sau it giay cooldown - KHONG can Dy tu tay
        # bam lai file .bat.
        print(f"\n[CRASH] Worker gap loi khong luong truoc: {e}")
        try:
            _worker_id_for_crash_report = get_worker_id()
        except Exception:
            _worker_id_for_crash_report = "UNKNOWN"
        report_worker_crash(_worker_id_for_crash_report, f"{type(e).__name__}: {e}")
        sys.exit(1)  # ma thoat khac 0 - de .bat/nguoi doc log phan biet duoc voi thoat sach
