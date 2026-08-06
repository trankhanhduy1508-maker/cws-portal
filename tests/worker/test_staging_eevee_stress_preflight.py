import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCENE = ROOT / "tests" / "assets" / "cws_blender_unoptimized_eevee_stress.blend"
MANIFEST = ROOT / "tests" / "fixtures" / "cws_eevee_stress_staging_manifest.json"
PREFLIGHT = ROOT / "worker" / "staging_eevee_stress_preflight.py"


class StagingEeveeStressPreflightTests(unittest.TestCase):
    def test_manifest_matches_committed_scene_contract(self):
        import json
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(data["expected_frames"], [1, 48])
        self.assertEqual(data["scene_relative_path"], "tests/assets/cws_blender_unoptimized_eevee_stress.blend")
        self.assertFalse(data["autoexec"])
        self.assertEqual(len(data["scene_sha256"]), 64)
        self.assertEqual(data["expected_final_frame_count"], 48)

    def test_preflight_is_read_only_and_never_prints_secret_values(self):
        text = PREFLIGHT.read_text(encoding="utf-8")
        self.assertIn("staging_env_missing", text)
        self.assertNotIn("CWS_STAGING_B2_APP_KEY=", text)
        self.assertNotIn("print(os.environ", text)
        self.assertTrue(SCENE.is_file())


if __name__ == "__main__":
    unittest.main()
