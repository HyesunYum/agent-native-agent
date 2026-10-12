# ANA chat onboarding validation — 2026-10-12

Status: **passed for the tested Claude subscription flow**, including user-completed
sign-in, the actual post-login safety notice, workspace trust, a real reply, and
conversation reload. Checked on 2026-10-12 with Claude Code 2.1.296.

## Changes

- Recognize Claude Code's seven unnumbered theme options and navigate using arrows.
- Render login method choices, a complete allowlisted OAuth link, a password-type
  code field, and explicit confirmation cards inside ANA chat.
- Keep unfinished input, focus, and selection through health/SSE updates.
- Constrain card height and scroll on small screens; pause ordinary chat input
  while setup is active.
- Send authentication codes only to the live login prompt. Never commit a code as
  an ANA chat message; redact possible later terminal echoes before persistence.
- Preserve the standalone, single-file channel runtime and existing menu actions.

## Actual Codespaces run

Fresh `main` Codespace, 2 cores / 8 GB, Linux, Claude Code 2.1.296,
Node 24.21.0, tmux 3.3a. Candidate files were copied into that isolated environment
and only the ANA server was restarted; the real Claude process was kept running.
No existing user Codespaces were modified.

| Check | Evidence |
| --- | --- |
| Baseline failure reproduced | Theme prompt visible in tmux; ANA health had `dialog: false`, `dialogInfo: null`, `ready: false` |
| Seven theme buttons | Rendered in real browser; Light mode selected through ANA |
| Login account selection | Subscription option selected through ANA |
| OAuth URL | 465 characters, all eight parameter names present, percent escapes and plus signs preserved across three terminal lines |
| Login link click | Opened a new tab on official `claude.ai`; headless browser reached the site's browser verification page, so this does not prove authentication |
| Input stability | Value, focus, and selection 4–9 retained across 6.5 seconds of updates |
| Mobile | 390×844, card x=14, width=362, height=354; fits viewport |
| User authentication through ANA | Completed by the user; CLI `loggedIn: true` confirmed |
| Actual Security notes | Read-only numbered prose, one Continue button; no false choice buttons or logo fragments |
| Actual folder trust | Unnumbered choices, default No preserved; Yes chosen through ANA using Down + Enter |
| Real first reply | Chat POST 200; assistant replied with the exact requested smoke-test marker, no tools or file edits requested |
| Conversation reload | Reply retained; chat reopened after page reload |

## Timing

These are observations, not service guarantees. Codespaces measurements include
network overhead. Human login time is excluded and has not been measured.

| Measurement | Result | Method/sample |
| --- | --- | --- |
| Create request → ANA health success | 133.4 s | One fresh Codespace; local start 11:10:20.310 UTC → creation-log health success 11:12:33.741 UTC |
| Container postCreate + postStart | 26.2 s | Creation log 11:12:07.513 → 11:12:33.741 UTC |
| Browser navigation → initialized ANA | 3.18 s | One authenticated private-port browser load; includes GitHub port notice |
| Theme click → account choices | 617 ms | One real Claude transition through ANA browser UI |
| Account choice → login link | 827 ms | One real Claude transition through ANA browser UI |
| Security notes Continue → folder trust | 437 ms | One real Claude transition through ANA |
| Folder trust selection → ready | 586 ms | One real Claude transition through ANA |
| Send → first assistant reply rendered | 4,189 ms | One real Claude request; includes network and inference time |
| Terminal screen change → chat rendering | median 300 ms, max 317 ms | Final batch of ten local tmux fixture transitions with real ANA server, SSE, and Chrome; default 300 ms poll interval. Earlier batches had maxima up to 324 ms |

## Reproducible regression checks

`npm test` includes 13 onboarding parser/action tests, 9 existing node:test tests,
and 79 application tests (101 total). The final local and Linux Codespaces runs both passed all 101 tests.
The additional browser test uses an isolated tmux session and temporary state,
checks seven choices, URL integrity, input/caret stability, code delivery without
chat persistence, Continue/trust buttons, reload, and layouts at 1280×900,
390×844, and 320×568. Its timings are fixture measurements, not Claude API latency.

```sh
npm test
# Test-only dependency outside the repository; Chrome and tmux must be installed.
npm install --prefix /tmp/ana-browser-tests playwright
NODE_PATH=/tmp/ana-browser-tests/node_modules node scripts/onboarding-browser-test.cjs
```

The browser script prints timing samples and the temporary result file location.
It sends only a fake code to its mock terminal, never to Claude's OAuth service.
No real credentials, OAuth URLs, or authorization codes belong in this record.

## Failures found and corrected during live onboarding

The first candidate's safety-notice fixture omitted the actual numbered paragraphs.
The parser therefore misclassified the live notice as a choice menu and included
terminal logo fragments. The user's screenshot exposed this gap. The exact screen
is now covered by parser/action tests and the real-browser test; it renders prose
and one Continue action, and sending a numeric choice is rejected.

The next live screen used unnumbered workspace trust choices, unlike the older
numbered fixture. A dedicated parser now preserves their real order and default
No selection and uses cursor navigation. Both the actual screen and mock-terminal
browser flow passed after the correction.

The first reload assertion expected chat to remain open; this app collapses chat
on a fresh page load. The test now explicitly reopens it and confirms the saved
reply. This was an automation assumption and did not require a product change.

The published quick-start guides describe the verified subscription path.
Other organization/provider login policies and future CLI versions are outside
this run. Existing stop/start and full-rebuild checks remain recorded separately
in [VALIDATION.md](VALIDATION.md).
