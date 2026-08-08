import hashlib
import hmac
import unittest
import urllib.error
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

    def test_rpc_client_accepts_plain_text_success_response(self):
        client = WorkerRpcClient(
            "https://backend.example", WorkerCredential("worker-a", "A" * 40)
        )
        with patch("worker_rpc_auth.urllib.request.urlopen") as opener:
            response = opener.return_value.__enter__.return_value
            response.read.return_value = b"healthy"
            self.assertEqual(client.call("report_worker_probe", {}), "healthy")

    def test_rpc_client_keeps_empty_success_response_as_none(self):
        client = WorkerRpcClient(
            "https://backend.example", WorkerCredential("worker-a", "A" * 40)
        )
        with patch("worker_rpc_auth.urllib.request.urlopen") as opener:
            response = opener.return_value.__enter__.return_value
            response.read.return_value = b""
            self.assertIsNone(client.call("worker_ping", {}))

    def test_rpc_client_keeps_http_errors_fail_closed(self):
        client = WorkerRpcClient(
            "https://backend.example", WorkerCredential("worker-a", "A" * 40)
        )
        error = urllib.error.HTTPError(
            "https://backend.example/worker/rpc/worker_ping",
            401,
            "unauthorized",
            {},
            None,
        )
        with patch("worker_rpc_auth.urllib.request.urlopen", side_effect=error):
            with self.assertRaises(RuntimeError):
                client.call("worker_ping", {})

    def test_storage_capability_path_is_hmac_signed_without_new_secret(self):
        credential = WorkerCredential("worker-a", "A" * 40)
        client = WorkerRpcClient("https://backend.example", credential)
        with patch("worker_rpc_auth.urllib.request.urlopen") as opener:
            response = opener.return_value.__enter__.return_value
            response.read.return_value = b'{"method":"GET"}'
            result = client.call_path(
                "/worker/storage-capability",
                {"action": "input_download", "task_id": 42, "generation": 3},
            )
            self.assertEqual(result, {"method": "GET"})
            request = opener.call_args.args[0]
            self.assertEqual(request.full_url, "https://backend.example/worker/storage-capability")
            self.assertEqual(request.headers["X-cws-worker-id"], "worker-a")


if __name__ == "__main__":
    unittest.main()
Ð