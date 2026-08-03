# PARSEC AUTO-START REPORT

Date: 2026-08-04  
Machine: Windows 10 Pro 10.0.19045 (build 19045)  
Operator session: Administrator

## Result

The official Parsec Windows installer was downloaded from `builds.parsec.app` and verified before installation. The installer reported version `150.104.1.0`, with a valid Unity Technologies SF code signature.

Parsec was installed as **Per Computer** using the official installer flag `/percomputer`. This is the current official name for the former Shared installation and is the correct installation type for access at the Windows login screen.

## Verification checklist

| Check | Result | Evidence |
|---|---|---|
| Windows version | PASS | Windows 10 Pro 10.0.19045, build 19045 |
| Administrator permission | PASS | Current session is Administrator |
| Existing Parsec install before change | PASS | No executable, uninstall entry, process, service, task or Run entry found |
| Portable/old Parsec used | PASS | Not used |
| Official installer | PASS | `C:\Program Files\Parsec\parsecd.exe`, version 150.104.1.0 |
| Installation type | PASS | `C:\Program Files\Parsec\setup.json` contains `useProgramData: true` |
| Official Parsec service | PASS | Service `Parsec`, `Running`, `Automatic`, `LocalSystem`, `pservice.exe` |
| Registry Run / RunOnce | NOT USED | No Parsec entry created or required |
| Task Scheduler | NOT USED | No Parsec task created or required |
| Startup hack / SendKeys / AutoHotkey | NOT USED | None created |
| Hosting setting | NOT VERIFIED | Parsec docs say Windows hosting is enabled by default; account session is not authenticated yet |
| Starts after reboot | NOT VERIFIED | Reboot not performed before the required Parsec account login |
| Works without manually opening Parsec | NOT VERIFIED | Service is auto-start, but no authenticated Parsec host exists yet |
| Works before Windows user login | NOT VERIFIED | Per Computer supports this; actual remote test requires authenticated account/team computer |
| Remote connection verified | NOT VERIFIED | Requires another Parsec client and account access |

## Current local evidence

- `Parsec` service is `Running`, `StartMode=Auto`, `StartName=LocalSystem`.
- `parsecd.exe` and `pservice.exe` are running from `C:\Program Files\Parsec`.
- Parsec log reports release `150-104a`, service `13`, loader `17`, and hosting initialization without a startup error.
- `C:\ProgramData\Parsec\user.bin` was not present, so Parsec is not authenticated on this machine yet.
- No Defender/UAC/firewall setting was disabled or changed.

## MORNING OWNER TODO

1. Open Parsec on the Host and sign in with the intended Parsec account. Complete the account's MFA/2FA if requested.
2. In Parsec Settings → Host, confirm `Hosting Enabled` is on. Do not change unrelated security settings.
3. From a second Parsec client, confirm this Host appears Online/Available and complete one remote connection test.
4. Only after the account is authenticated, reboot the Host and verify the same remote connection again without manually opening Parsec.

Until steps 1–4 are completed, this setup is **not COMPLETE** and must not be reported as remotely verified.

## Official references

- https://support.parsec.app/hc/en-us/articles/32381368159124-Install-Parsec-App-on-Windows
- https://support.parsec.app/hc/en-us/articles/32381199341716-Parsec-App-for-Windows
- https://parsec.app/downloads
