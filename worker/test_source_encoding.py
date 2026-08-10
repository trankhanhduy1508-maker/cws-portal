from pathlib import Path
import unittest


class SourceEncodingTests(unittest.TestCase):
    def test_worker_python_sources_are_utf8(self):
        root = Path(__file__).parent
        for path in root.glob("*.py"):
            with self.subTest(path=path.name):
                path.read_bytes().decode("utf-8")


if __name__ == "__main__":
    unittest.main()
