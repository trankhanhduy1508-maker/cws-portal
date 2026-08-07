# Official Blender fixture verification — 2026-08-07

## Source

- URL: `https://download.blender.org/demo/color_vortex.blend`
- Source is the official Blender download host and the directory exposes the
  file as `application/octet-stream`.
- The file is small enough for a bounded smoke test and is a real Blender
  demo file, not an HTML response.

## Download evidence

The first direct download was 95,091 bytes. The payload is gzip-compressed,
which is accepted by Blender as a compressed blend file; after bounded local
decompression the verified Blender payload was:

- size: `556,884` bytes
- magic: `BLENDER`
- SHA-256: `159331336784B885F8978C222E463B508F35F5E6E30B35987CEA34C4C77065BA`
- HTTP content type: `application/octet-stream`
- HTML/error payload: not detected

The production downloader now validates direct `.blend` signatures (including
gzip-compressed Blender files) and ZIP signatures before the Worker Engine can
open the input. Invalid HTML/short error bodies fail closed and are cleaned up.

## Runtime boundary

The fixture is verified as a real public Blender file. It has not been claimed
as a production render: this machine has no physical production Worker,
Worker credential, B2 credential, or authenticated production job evidence.
Required evidence remains Worker claim → real Blender PID → output → B2
upload/checksum → backend completion → customer download.
