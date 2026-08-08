import hashlib
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from enroll_worker_identity import enrollment_url, redeem


class _Response:
    status = 201

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def read(self, _limit):
        return b'{"workerId":"CWS-A"}'


class EnrollmentTests(unittest.TestCase):
    def test_production_url_requires_https(self):
        self.assertEqual(
            enrollment_url("https://backend.example/"),
            "https://backend.example/worker/enrollment/redeem",
        )
        with self.assertRaises(ValueError):
            enrollment_url("http://backend.example")

    @patch("enroll_worker_identity.urllib.request.urlopen", return_value=_Response())
    def test_redeem_sends_hash_not_final_credential(self, urlopen):
        final = "F" * 43
        worker_id = redeem(
            url="https://backend.example/worker/enrollment/redeem",
            enrollment_token="T" * 43,
            worker_id="CWS-A",
            final_credential=final,
            hostname="MAY083",
            gpu_name="GPU",
            vram_mb=8192,
            timeout_seconds=30,
        )
        self.assertEqual(worker_id, "CWS-A")
        request = urlopen.call_args.args[0]
        payload = json.loads(request.data)
        self.assertEqual(payload["credentialHash"], hashlib.sha256(final.encode()).hexdigest())
        self.assertNotIn(final, request.data.decode())
        self.assertEqual(payload["token"], "T" * 43)


if __name__ == "__main__":
    unittest.main()
