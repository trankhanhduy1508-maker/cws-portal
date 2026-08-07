# Physical Worker production E2E blocker — 2026-08-07

## Host/input verification

- Windows host: verified.
- Official fixture: `https://download.blender.org/demo/color_vortex.blend`.
- Decompressed input: 556,884 bytes, magic `BLENDER`.
- Input SHA-256: `159331336784B885F8978C222E463B508F35F5E6E30B35987CEA34C4C77065BA`.
- Blender: 5.2.0 LTS portable, archive SHA-256 verified as
  `2d184b626c001692c362291911293b6a297179d618d95e9e9192c3a80318adc4`.
- Local real render: Blender PID `13156`, EEVEE, log render time `00:02.49`.
- Local output: `frame_0001-0600.mp4`, 98,992 bytes.

This proves the Windows host and official fixture can open/render. It is not
production E2E evidence.

## Production blocker evidence

The current Windows process/user/machine environment has none of the required
production configuration: `CWS_BACKEND_URL`, `CWS_WORKER_ID`,
`CWS_WORKER_CREDENTIAL_FILE`, `CWS_WORKSPACE`, B2 endpoint/bucket/key values,
or `CWS_GOOGLE_DRIVE_API_KEY`. No DPAPI Worker credential file was found.
The Desktop package also contains only the generic launcher and does not
contain the canonical `production_node_agent.py` runtime.

Therefore no production job was created and no claim is made for Worker claim,
backend lease, B2 upload, completion, payment or customer download.
