# CWS Codex Telegram Completion Hook

> Status: ACTIVE local-operator workflow documentation.
> Purpose: preserve the Founder-approved Codex completion-notification behavior without committing secrets or machine-local Codex configuration.

## Intent

The Telegram notification is an operator convenience for long Codex tasks.

It is **not** a production CWS dependency and does not participate in Customer, Worker, Scheduler, payment, storage, auth, or production state transitions.

Normal CWS production must continue to work when Telegram, Codex, ChatGPT, or the Founder is offline.

## Required completion semantics

For a Founder prompt/task, Telegram must be sent only after all of the following are complete:

1. every requirement in the current prompt has been addressed;
2. required implementation work is finished;
3. required tests/build/lint/runtime verification for that prompt are finished;
4. complete diff/self-review is finished when applicable;
5. remaining risks and unverified items are identified;
6. the final Codex report for the prompt has been completed.

Only then send exactly **one** completion notification.

A generic Stop event by itself is not proof that the whole Founder prompt is complete. The completion hook must be used/configured so the semantic result matches the rules above.

## Result labels

Use one of:

- `PASS` — all requested work and required verification completed successfully;
- `BLOCKED` — the task cannot continue without external action, missing access/evidence, or Founder approval;
- `NEEDS REVIEW` — implementation/verification finished to the requested gate but human/system review remains required before merge/deploy or another protected action.

Do not report `PASS` when any required prompt item remains incomplete.

## Message format

Recommended minimal format:

```text
CWS Codex: DONE
Task: <short summary>
Result: PASS | BLOCKED | NEEDS REVIEW
```

Telegram messages must not contain secrets, credentials, customer data, private project contents, or sensitive logs.

## Local secret/config boundary

The following values are local-only and must never be committed to GitHub:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- real token values
- real Chat IDs when not operationally necessary in documentation

Store token and Chat ID as Windows **User environment variables**.

The Codex local hook files live outside the repository, typically:

```text
%USERPROFILE%\.codex\config.toml
%USERPROFILE%\.codex\telegram-notify.ps1
```

Do not copy those machine-local files into the CWS repository unless a future Founder-approved sanitized template is intentionally created.

## Local hook behavior

The local notification script must:

1. read `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from environment variables;
2. never hard-code either value;
3. never print/log either value;
4. send one short completion message only;
5. fail safely if Telegram is unavailable;
6. never modify CWS product/runtime state;
7. never make Telegram success a prerequisite for CWS task correctness.

## Verification checklist

After setup or repair:

1. Telegram Bot API token validation succeeds (`getMe` equivalent);
2. Chat ID is obtained from the operator's own bot conversation/update;
3. standalone `sendMessage` test succeeds;
4. standalone notification script test succeeds;
5. one harmless Codex task completes;
6. notification occurs only after the task's final report is complete;
7. exactly one notification is observed;
8. no premature notification occurs;
9. no secret appears in terminal output, logs, repo diff, or Git history.

## Current verified local implementation checkpoint — 2026-08-13

Founder workstation evidence showed:

- Codex CLI `0.147.0`;
- Telegram Bot API `getMe` succeeded;
- Chat ID was discovered and stored as a Windows User environment variable;
- standalone Telegram `sendMessage` succeeded;
- local Codex completion hook test reported exactly-one notification PASS;
- secret exposure reported `NO`;
- local files used were `%USERPROFILE%\.codex\telegram-notify.ps1` and `%USERPROFILE%\.codex\config.toml`.

This is local operator-tooling evidence only. It is not production CWS verification.

## CWS workflow integration

Telegram notification is the **last operator notification step**, not an engineering gate by itself:

```text
Founder prompt
-> Codex work in VS Code
-> tests/build/lint/runtime verification as required
-> diff/self-review
-> final Codex report
-> exactly one Telegram completion notification
-> GPT/product-system review when required
-> Founder merge/deploy decision when required
```

For step-by-step Golden E2E work, each prompt should still stop at the explicitly requested gate. Telegram only reports that the current prompt/gate has finished; it does not authorize moving to the next protected step automatically.

## Forbidden behavior

- no token or Chat ID in source control;
- no customer/project secrets in Telegram;
- no Telegram dependency in production runtime;
- no notification before final task report;
- no duplicate completion notifications;
- no automatic merge/deploy/migration/reboot/shutdown because a notification succeeded;
- no treating a Stop hook event alone as equivalent to Golden E2E/task PASS.
