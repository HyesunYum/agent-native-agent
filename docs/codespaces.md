# Start ANA in your browser without local installation


[한국어](codespaces.ko.md) · **English**

Run ANA and Claude Code inside GitHub Codespaces. Your computer needs only a browser: no local WSL, Node, tmux or Claude Code installation. Bring a GitHub account and an account with Claude Code access. You will sign in to Claude once inside the codespace; your computer's login is not copied.

## Create your environment

In this repository, choose **Code → Codespaces → Create codespace**. A 2-core machine is sufficient for this configuration. Wait for container creation and the setup commands to finish. Node, tmux, Claude Code and ANA dependencies are installed, then the server and Claude terminal start automatically.

GitHub may show a development-port notice. Check that the address belongs to your codespace and select **Continue**.

## Sign in to Claude once

1. Open **Terminal → New Terminal** in the browser editor.
2. Attach to the running Claude terminal:

   ```bash
   bash .devcontainer/connect.sh
   ```

3. Choose a terminal style and your account's login method.
4. If a browser does not open automatically, open the displayed login URL yourself. If you receive a login code, paste it into **Claude's terminal prompt**, never an issue or chat message.
5. Complete onboarding and confirm whether you trust the project folder. If **Try the new fullscreen renderer?** appears, choose **Not now**; ANA was tested with the existing terminal renderer.
6. Press **Ctrl+B**, release both keys, then press **D** to detach. Claude keeps running.

**If the login URL looks truncated:** do not reconstruct it from wrapped lines inside tmux. Detach with **Ctrl+B**, then **D**, and print the complete clipboard URL with `tmux show-buffer`. Open that terminal link, then run `bash .devcontainer/connect.sh` again to paste the login code into Claude.

Users must complete authentication themselves. Subscription login does not require creating an API key. Organization policies may restrict login methods.

## Open ANA

Under **Ports**, find **ANA / 8809** and click the globe icon (**Open in Browser**). Keep port visibility **Private**. Its address is `https://<codespace-name>-8809.app.github.dev`.

Send `Hello` in ANA's chat and check for a response. You can close the setup terminal. Use the ANA address while the codespace is running.

## Return later

Open the **existing** environment from [your codespaces](https://github.com/codespaces), instead of creating another one. ANA and the Claude process start automatically on container start. If Claude requests login or onboarding again, attach using the command above.

If the codespace is running but ANA is unavailable, run:

```bash
bash .devcontainer/start.sh
```

Then reopen port 8809.

## Data and costs

- ANA state lives in the repository's ignored `.ana/` directory. Claude credentials and history live outside the checkout in `/workspaces/.ana-private/`. Do not commit credentials or private conversations.
- `/workspaces` persists across stop/start and container rebuilds. **Deleting a codespace deletes unbacked-up data.** Committing source code does not back up private application data.
- Idle codespaces stop automatically, stopping ANA and its agent too. This configuration is not an always-on server.
- Codespaces compute and storage are billed separately from Claude. GitHub plans include different usage allowances; storage can remain billable while stopped.
- The agent operates on files in the cloud environment. Your local computer's files are not automatically available.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Recovery mode | Container creation failed. Read the creation log; installation has not completed. |
| Claude login/onboarding screen | Run `bash .devcontainer/connect.sh` and complete the prompts. |
| Agent input line is not ready | Check the Claude terminal for login, trust or selection prompts. |
| ANA URL is unavailable | Check that the codespace is running and port 8809 is forwarded. Your computer's `localhost:8809` is not this server. |
| Another account cannot open ANA | Private ports require access to the codespace. Check the signed-in GitHub account. |

References: [GitHub port forwarding](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace), [persistence across rebuilds](https://docs.github.com/en/codespaces/developing-in-a-codespace/rebuilding-the-container-in-a-codespace), [Codespaces billing](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces), [Claude authentication](https://code.claude.com/docs/en/authentication).
