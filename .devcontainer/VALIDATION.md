# Codespaces validation record

Status: **in progress — not released to main**. Checked on 2026-10-11.

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
| Claude initial login | Pending user authentication |
| Real prompt and response in ANA | Pending login |
| Stop/start, data and login persistence | Pending |
| Full rebuild, data and login persistence | Pending |
| Fresh creation from final release configuration | Pending |

Do not remove the draft notices or publish the README quick-start button until all
pending checks pass. Never attach credentials or OAuth codes to this record.
