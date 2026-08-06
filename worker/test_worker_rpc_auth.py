import hashlib
import hmac
import unittest
from unittest.mock import patch

from worker_rpc_auth import WorkerCredential, WorkerRpcClient, build_auth_headers, canonical_request


class WorkerRpcAuthTests(unittest.TestCase):
    def test_signature_binds_identity_request_and_body(self):
        credential = WorkerCredential("worker-a", "A" * 40)
        headers = build_auth_headers(credential, "POST", "/worker/rpc/worker_ping", b"{}", 1_700_000_000, "nonce-1234567890")
        canonical = canonical_request("worker-a", "1700000000", "nonce-1234567890", "POST", "/worker/rpc/worker_ping", b"{}")
        expected = hmac.new(credential.token.encode(), canonical, hashlib.sha256).hexdigest()
        self.assertEqual(headers["X-CWS-Worker-Signature"], expected)

    def test_same_nonce_is_not_generated_by_client_retries(self):
        credential = WorkerCredential("worker-a", "A" * 40)
        first = build_auth_headers(credential, "POST", "/worker/rpc/worker_ping", b"{}", 1_700_000_000, "nonce-1234567890")
        second = build_auth_headers(credential, "POST", "/worker/rpc/worker_ping", b"{}", 1_700_000_000, "nonce-1234567891")
        self.assertNotEqual(first["X-CWS-Worker-Nonce"], second["X-CWS-Worker-Nonce"])

    def test_production_client_rejects_plain_http(self):
        with self.assertRaises(ValueError):
            WorkerRpcClient("http://backend.example", WorkerCredential("worker-a", "A" * 40))

    def test_rpc_client_sends_worker_auth_headers_without_logging_token(self):
        credential = WorkerCredential("worker-a", "A" * 40)
        client = WorkerRpcClient("https://backend.example", credential)
        with patch("worker_rpc_auth.urllib.request.urlopen") as opener:
            response = opener.return_value.__enter__.return_value
            response.read.return_value = b'{"ok":true}'
            self.assertEqual(client.call("worker_ping", {}), {"ok": True})
            request = opener.call_args.args[0]
            self.assertEqual(request.headers["X-cws-worker-id"], "worker-a")
            self.assertIn("Worker ", request.headers["Authorization"])


if __name__ == "__main__":
    unittest.main()
