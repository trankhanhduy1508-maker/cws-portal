"""
CWS Worker - Bo test OFFLINE mo rong cho cac ham san xuat that trong
cws_worker_full.py (2026-08-03).

MUC DICH: mo rong pham vi verify runtime ngoai buoc render 1 frame co
ban da lam trong setup_worker_runtime_test.ps1 - test THEM cac nhanh
code/duong dan loi ma render bao gio cung phai xu ly dung (multi-frame,
enable_autoexec=False cho job khach upload, ham render_single_frame()
rieng, ma GPU fix, file .blend khong ton tai, anh corrupt/den).

RANH GIOI AN TOAN (giong het setup_worker_runtime_test.ps1): CHI goi
ham local/thuan tuy cua cws_worker_full.py, TUYET DOI KHONG goi
worker_loop()/claim_task()/claim_next_generic_task()/upload_single_frame()
- khong dung Supabase/B2 that, khong anh huong Fleet production.

Cach chay: dat CWS_DIR tro vao thu muc test (co san Blender portable),
roi:  python worker_offline_function_tests.py <repo_root> <test_dir>
"""
import json
import os
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    print("Cach dung: python worker_offline_function_tests.py <repo_root> <test_dir>")
    sys.exit(2)

REPO_ROOT = sys.argv[1]
TEST_DIR = Path(sys.argv[2])

sys.path.insert(0, REPO_ROOT)
os.environ["CWS_DIR"] = str(TEST_DIR)
import cws_worker_full as w  # noqa: E402

results = []


def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    results.append({"name": name, "status": status, "detail": detail})
    print(f"[{status}] {name}" + (f" - {detail}" if detail else ""))


# ---------------------------------------------------------------------
# Chuan bi 1 scene .blend dung chung cho ca file (scene mac dinh cua
# chinh Blender - KHONG phai file that cua khach/Owner).
# ---------------------------------------------------------------------
probe_blend = TEST_DIR / "offline_probe_scene.blend"
r = subprocess.run(
    [str(w.BLENDER_EXE), "-b", "--python-expr",
     f"import bpy; bpy.ops.wm.save_as_mainfile(filepath=r'{probe_blend}')"],
    capture_output=True, text=True,
)
check("tao scene .blend probe", r.returncode == 0 and probe_blend.exists(),
      f"returncode={r.returncode}")

# ---------------------------------------------------------------------
# 1) render_frame_range() nhieu frame (2 frame) - enable_autoexec=True
#    (duong dan job Owner tu chon, JOB_IDS_MULTI)
# ---------------------------------------------------------------------
out_dir_multi = TEST_DIR / "offline_out_multi"
valid_files, err, sec = w.render_frame_range(probe_blend, 1, 2, out_dir_multi, enable_autoexec=True)
check("render_frame_range() 2 frame, enable_autoexec=True",
      len(valid_files) == 2 and err is None,
      f"valid={len(valid_files)} err={err} sec/frame={sec}")

# ---------------------------------------------------------------------
# 2) render_frame_range() voi enable_autoexec=False (duong dan job khach
#    upload qua claim_next_generic_task() - P0 fix 2026-08-03, xem
#    CWS_P0_SECURITY_FIX_2026-08-03.md). Scene mac dinh khong can Driver
#    nen van phai render thanh cong du autoexec tat.
# ---------------------------------------------------------------------
out_dir_noauto = TEST_DIR / "offline_out_noautoexec"
valid_files2, err2, sec2 = w.render_frame_range(probe_blend, 1, 1, out_dir_noauto, enable_autoexec=False)
check("render_frame_range() enable_autoexec=False (duong dan khach upload)",
      len(valid_files2) == 1 and err2 is None,
      f"valid={len(valid_files2)} err={err2}")

# ---------------------------------------------------------------------
# 3) render_single_frame() - ham checkpoint per-frame rieng (khac ham
#    render_frame_range() da test o setup_worker_runtime_test.ps1)
# ---------------------------------------------------------------------
out_dir_single = TEST_DIR / "offline_out_single"
single_file, single_err, single_sec = w.render_single_frame(probe_blend, 1, out_dir_single, enable_autoexec=True)
check("render_single_frame()",
      single_file is not None and single_err is None,
      f"file={single_file} err={single_err} sec={single_sec}")

# ---------------------------------------------------------------------
# 4) render_single_frame() voi optimization_code = ma GPU texture fix
#    that (get_gpu_texture_reload_fix_code()) - xac nhan ma nay CHAY
#    THAT duoc ben trong Blender that qua --python-expr, khong crash.
# ---------------------------------------------------------------------
out_dir_gpufix = TEST_DIR / "offline_out_gpufix"
gpu_code = w.get_gpu_texture_reload_fix_code()
gpufix_file, gpufix_err, gpufix_sec = w.render_single_frame(
    probe_blend, 1, out_dir_gpufix, optimization_code=gpu_code, enable_autoexec=True
)
check("render_single_frame() voi get_gpu_texture_reload_fix_code()",
      gpufix_file is not None and gpufix_err is None,
      f"file={gpufix_file} err={gpufix_err}")

# ---------------------------------------------------------------------
# 5) Duong dan LOI: file .blend khong ton tai - PHAI tra ve loi co kiem
#    soat (khong duoc raise exception khong bat, khong duoc "thanh cong
#    gia" voi danh sach rong ma khong bao loi).
# ---------------------------------------------------------------------
fake_blend = TEST_DIR / "khong_ton_tai.blend"
out_dir_missing = TEST_DIR / "offline_out_missing"
valid_files3, err3, sec3 = w.render_frame_range(fake_blend, 1, 1, out_dir_missing, enable_autoexec=True)
check("render_frame_range() voi .blend khong ton tai -> loi co kiem soat",
      len(valid_files3) == 0 and err3 in ("permanent", "persistent"),
      f"valid={len(valid_files3)} err={err3}")

# ---------------------------------------------------------------------
# 6) validate_rendered_image() - test truc tiep ham kiem tra ket qua,
#    dung lai file PNG that vua render o Buoc 1 (hop le) + 2 truong hop
#    LOI tu tao (file rac / file qua nho) de xac nhan phat hien dung.
# ---------------------------------------------------------------------
valid_png = valid_files[0] if valid_files else None
if valid_png:
    ok, reason = w.validate_rendered_image(valid_png)
    check("validate_rendered_image() tren PNG that hop le", ok is True, reason)
else:
    check("validate_rendered_image() tren PNG that hop le", False, "khong co PNG de test (Buoc 1 that bai)")

corrupt_file = TEST_DIR / "offline_corrupt.png"
corrupt_file.write_bytes(b"\x89PNG\r\n\x1a\n" + b"khong phai du lieu PNG that" * 20)
ok_corrupt, reason_corrupt = w.validate_rendered_image(corrupt_file)
check("validate_rendered_image() phat hien file PNG corrupt", ok_corrupt is False, reason_corrupt)

tiny_file = TEST_DIR / "offline_tiny.png"
tiny_file.write_bytes(b"\x89PNG\r\n\x1a\n")
ok_tiny, reason_tiny = w.validate_rendered_image(tiny_file)
check("validate_rendered_image() phat hien file qua nho", ok_tiny is False, reason_tiny)

# ---------------------------------------------------------------------
# 7) extract_drive_file_id() - ham thuan tuy (regex), test voi cac dang
#    link Google Drive thuc te da biet.
# ---------------------------------------------------------------------
try:
    id1 = w.extract_drive_file_id("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing")
    id2 = w.extract_drive_file_id("https://drive.google.com/uc?id=1AbCdEfGhIjKlMnOp&export=download")
    check("extract_drive_file_id() ca 2 dang link", id1 == "1AbCdEfGhIjKlMnOp" and id2 == "1AbCdEfGhIjKlMnOp",
          f"id1={id1} id2={id2}")
except Exception as e:
    check("extract_drive_file_id() ca 2 dang link", False, str(e))

# ---------------------------------------------------------------------
# Tong ket
# ---------------------------------------------------------------------
overall = "PASS" if all(r["status"] == "PASS" for r in results) else "FAIL"
print(f"\n=== TONG KET OFFLINE FUNCTION TESTS: {overall} "
      f"({sum(1 for r in results if r['status']=='PASS')}/{len(results)} PASS) ===")

evidence_path = Path(REPO_ROOT) / "reports" / "worker" / "WORKER_OFFLINE_FUNCTION_TESTS_2026-08-03.json"
evidence_path.write_text(json.dumps({"overall": overall, "results": results}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"[evidence] Da ghi: {evidence_path}")

sys.exit(0 if overall == "PASS" else 1)
