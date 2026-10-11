# Codespaces validation record

Status: **passed**. Checked on 2026-10-11 against runtime/setup commit `e6ffc69`; the release adds documentation only.

Environment: GitHub Codespaces `basicLinux32gb` (2 cores / 8 GB), Linux x64,
`mcr.microsoft.com/devcontainers/javascript-node:5.2.3-24-bookworm`,
Node 24.21.0, tmux 3.3a, Claude Code 2.1.296.

| Check | Result |
| --- | --- |
| Container build on GitHub | Passed after correcting the image tag to the published 5.2.3 tag |
| postCreate installs pinned Claude and npm lockfile dependencies | Passed |
| postStart starts ANA and Claude tmux sessions | Passed; startup readiness must finish before opening ANA |
| Running start.sh again | Passed; reuses both existing sessions |
| Linux npm test | Passed: 9 node:test + 79 application tests |
| Local clean-checkout npm test | Passed: 9 + 79; first attempt collided with an unrelated process on its generated test port, retry used another port |
| Port 8809 visibility | Private |
| Anonymous forwarded API request | Redirected to authentication (302) |
| Authenticated forwarded dashboard | ANA loaded, no page errors or failed HTTP responses |
| Same-origin POST through Codespaces HTTPS forwarding | 200, workspace selection succeeded |
| SSE | Connected (EventSource.OPEN) |
| Mobile chat layout | Passed at 390×844; chat fits viewport |
| Claude initial login | Passed with user-completed subscription login |
| Real prompt and response in ANA | Passed through the browser Send button; response and page reload verified |
| Stop/start, data and login persistence | Passed with the final startup script: login, test note and original Claude session retained |
| Full rebuild, data and login persistence | Passed; same Claude session resumed and recalled the prior verification marker without being given it again |
| Fresh creation from final release configuration | Passed in a second, empty codespace; onboarding and private dashboard started automatically, repeated setup/start and all 88 tests passed |

The initial browser automation clicked before the app installed its handlers;
waiting for app initialization resolved this test timing issue. No app workaround
was used for the successful browser conversation checks.

The final configuration pins the tested devcontainer image tag and Claude CLI
version. Packages, account policies and upstream availability may still change;
this record describes the checks performed, not a guarantee of every future
provider version. No credentials or OAuth codes are included in this record.
