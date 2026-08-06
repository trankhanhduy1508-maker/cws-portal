from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
SCENE = ROOT / "tests" / "blender" / "create_unoptimized_eevee_stress_scene.py"
RUNNER = ROOT / "tests" / "blender" / "run_eevee_stress_render.py"


class StressSceneContractTests(unittest.TestCase):
    def test_scene_is_eevee_first_and_bounded(self):
        text = SCENE.read_text(encoding="utf-8")
        self.assertIn("BLENDER_EEVEE_NEXT", text)
        self.assertIn("BLENDER_EEVEE", text)
        self.assertIn("MAX_FRAMES = 48", text)
        self.assertIn("MAX_OBJECTS = 240", text)
        self.assertIn("MAX_LIGHTS = 32", text)
        self.assertNotIn("use_autoexec", text)


    def test_runner_is_local_only_and_timeout_bounded(self):
        text = RUNNER.read_text(encoding="utf-8")
        self.assertIn("--disable-autoexec", text)
        self.assertIn("timeout_seconds", text)
        self.assertNotIn("CWS_STAGING", text)
        self.assertIn('worker_flow\": \"NOT RUN', text)


if __name__ == "__main__":
    unittest.main()
