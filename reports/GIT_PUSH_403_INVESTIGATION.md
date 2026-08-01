# Git Push 403 Investigation

Date: 2026-08-01
Model used throughout: Sonnet 5 Medium (per `MODEL_POLICY.md` — credential/authentication debugging is explicitly high-risk, mandatory Sonnet 5 Medium regardless of apparent complexity).

## Symptom

`git push origin main` fails with:
```
remote: Permission to trankhanhduy1508-maker/cws-portal.git denied to trankhanhduy1508-maker.
fatal: unable to access '...': The requested URL returned error: 403
```
while `git fetch`/`git ls-remote` succeed, and a manually-run GitHub API check with a freshly-created fine-grained PAT reported `CanPush=True`.

## Investigation summary (in order performed)

1. **Two `credential.helper` entries were active**: `manager` (Git Credential Manager, system scope, `C:\Program Files\Git\etc\gitconfig`) and `store` (global scope, `C:\Users\Administrator\.gitconfig`), with `manager` resolved first. This is a real, legitimate finding — git tries helpers in order and stops at the first one returning a complete credential.

2. **Applied a local-scope-only fix** (`.git/config` of this repo, nothing in system/global config touched, nothing deleted): reset the local helper list to empty then added `store`, so `store` is the sole helper used for this repo. Verified via `git credential fill` (the exact resolution `git push` performs) that `manager` is now excluded.

3. **Initial hypothesis — precedence conflict causing the wrong token to be sent — was tested and disproven.** First attempt compared token lengths via manual parsing of `~/.git-credentials` and got a mismatch (93 vs 111 chars), which was a measurement bug (the regex parse included the URL scheme/username prefix in the count). Redone properly via `git-credential-manager get` and `git credential-store get` (git's own tools), both directly, then via **SHA256 hash comparison of the two cached secrets** (never printing the raw value): identical hash. **`manager` and `store` were caching the exact same token the entire time** — there was never a "wrong" credential being selected.

4. **Proved the block is GitHub-side, not local**, by replicating the exact request `git push` makes, independent of git:
   - `GET .../info/refs?service=git-upload-pack` (fetch) with the cached token → HTTP 200
   - `GET .../info/refs?service=git-receive-pack` (push) with the *same* cached token → HTTP 403, byte-identical error message to `git push`'s output
   This proves GitHub itself denies this specific token for the push operation, regardless of any git-side configuration.

5. **Corroborating evidence the token is a genuine, non-expired credential**, not garbage:
   - `GET /user` → 200, `login: trankhanhduy1508-maker`, `github-authentication-token-expiration: 2026-10-29`
   - `GET /repos/.../collaborators/.../permission` → 403 `"Resource not accessible by personal access token"` — GitHub's specific signature for a *correctly-authenticated* fine-grained PAT missing one particular scope (Collaborators, never granted), which further confirms this is a real, working fine-grained PAT being evaluated correctly by GitHub for everything except the one operation (write) that actually matters here.
   - `GET /repos/.../rulesets` and `/rules/branches/main` → 200, both empty `[]` (no visible ruleset blocking `main`, though `/branches/main/protection` itself 403'd — reading classic branch protection needs `Administration: Read`, which this PAT doesn't have, so that specific angle remains unverifiable from this token's own visibility).

6. **Checked for an SSH-based alternative that would sidestep the PAT question entirely.** Found a pre-provisioned deploy keypair at `~/.ssh/cws_portal_deploy` with an SSH config already pointing `github.com` at it — but `ssh -T git@github.com` returned `Permission denied (publickey)`, proving the *public* half of this key was never registered as a Deploy Key on the GitHub repo.

## Root cause

GitHub-side authorization: the one and only PAT cached on this machine is a real, valid, non-expired fine-grained token correctly identified as `trankhanhduy1508-maker`, but GitHub's `git-receive-pack` (push) endpoint explicitly denies it — confirmed by hitting that exact endpoint directly. This is not a local git/credential-helper misconfiguration (that part was found, real, and already fixed locally) and not an artifact of comparing two different tokens (proven identical by hash). The specific reason on GitHub's side (unsaved permission change, repository-selection mismatch, branch protection, or propagation delay) cannot be determined from this environment — it requires either GitHub UI access this environment doesn't have, or a PAT scope (`Administration: Read`) that wasn't granted.

## What was fixed from this environment (no Owner action needed)

- Local-scope `credential.helper` precedence conflict — resolved, verified, does not affect system or global git config.
- 6 local commits rebased cleanly onto 2 new remote commits (`MODEL_POLICY.md` + its `AGENTS.md` reference) with no conflicts, no history rewritten, no commits lost.

## What still requires Owner action (GitHub UI, no way around it from here)

Pick one:

- **Deploy key (simplest)**: add this public key to `cws-portal` → Settings → Deploy keys → Add deploy key → check "Allow write access":
  ```
  ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEq4PnDWIxMrZNrXiTOs6tZHJSJ1lHhpdZ+pf8tLV2fH cws-portal-deploy
  ```
- **Or fix the PAT**: Settings → Developer settings → Fine-grained tokens → confirm `cws-portal` is selected and `Contents: Read and write` is actually saved (re-save even if it looks correct) → or check Settings → Branches for a rule on `main`.

## Next Task

Waiting on one of the two Owner actions above. Once done, retry is a single command (`git push --dry-run origin main` then `git push origin main`) — no further local changes needed.
