# 설치 없이 브라우저에서 ANA 시작하기


**한국어** · [English](codespaces.md)

GitHub Codespaces 안에서 ANA와 Claude Code를 실행합니다. PC에 WSL, Node, tmux, Claude Code를 설치할 필요가 없습니다. 준비물은 **GitHub 계정**, **Claude Code를 사용할 수 있는 계정**, **웹 브라우저**입니다. PC에서 사용하던 Claude 로그인은 자동으로 옮겨지지 않으므로 최초 한 번 로그인합니다.

## 1. Codespace 만들기

저장소의 **Code → Codespaces → Create codespace**를 선택합니다. 기본 2코어 환경으로 실행할 수 있습니다. 처음에는 컨테이너 생성과 설치에 시간이 걸립니다. 아래쪽 터미널에서 설치 중이라면 완료될 때까지 기다립니다.

환경이 준비되면 Node, tmux, Claude Code, ANA 의존성이 설치되고 ANA 서버와 Claude 터미널이 자동으로 시작됩니다. GitHub의 개발 포트 안내 화면이 뜨면 자신의 Codespace 주소인지 확인하고 **Continue**를 누릅니다.

## 2. Claude 로그인 — 최초 한 번

1. Codespaces 편집기의 **Terminal → New Terminal**을 엽니다.
2. 다음 한 줄을 실행합니다. 설치 명령이 아니라, 이미 켜진 Claude 화면을 여는 명령입니다.

   ```bash
   bash .devcontainer/connect.sh
   ```

3. Claude의 화면 스타일을 선택하고 사용하는 계정 유형으로 로그인합니다.
4. 브라우저가 자동으로 열리지 않으면 터미널의 로그인 주소를 브라우저에서 엽니다. 인증 코드가 표시되면 **Claude 터미널의 코드 입력란**에 붙여 넣습니다. 비밀번호·토큰·인증 코드는 GitHub 이슈나 채팅에 올리지 않습니다.
5. 초기 안내와 프로젝트 폴더 신뢰 확인을 마칩니다. **Try the new fullscreen renderer?**가 나타나면 **Not now**를 선택합니다. ANA는 기존 터미널 화면 방식으로 검증했습니다.
6. **Ctrl+B를 누르고 손을 뗀 뒤 D**를 누릅니다. Claude는 계속 실행되고 터미널 연결만 해제됩니다.

**로그인 주소가 잘리거나 복사되지 않는 경우:** tmux 화면에서 여러 줄로 보이는 주소를 이어 붙이지 마세요. `Ctrl+B`, `D`로 나간 뒤 아래 명령으로 전체 주소를 출력하고, 터미널의 링크를 엽니다. 로그인 코드를 받은 뒤 연결 명령으로 다시 들어가 붙여 넣습니다.

```bash
tmux show-buffer
bash .devcontainer/connect.sh
```

로그인은 사용자가 직접 완료해야 합니다. Claude Code 구독으로 로그인할 때 별도 API 키를 만들 필요는 없습니다. 조직 계정은 관리자 정책에 따라 사용할 수 있는 로그인 방식이 다를 수 있습니다.

## 3. ANA 열고 대화하기

편집기 아래 **Ports**에서 **ANA / 8809** 행의 지구본 아이콘(**Open in Browser**)을 누릅니다. 포트 공개 범위는 **Private**을 유지합니다. 주소는 `https://<codespace 이름>-8809.app.github.dev` 형태입니다.

ANA 채팅에서 `안녕`을 보내 응답을 확인합니다. 설치나 로그인에 사용한 터미널은 닫아도 됩니다. 이후에는 이 ANA 주소를 브라우저에서 열어 사용합니다. Codespace가 실행 중이어야 접속됩니다.

## 다음에 다시 사용하기

[내 Codespaces](https://github.com/codespaces)에서 **기존 환경**을 다시 엽니다. 매번 새 환경을 만들지 않습니다. 재시작하면 ANA와 Claude 프로세스를 자동으로 다시 시작합니다.

로그인 화면이 다시 나오면 위의 연결 명령으로 들어가 확인합니다. 환경이 실행 중인데 ANA가 열리지 않으면 다음을 실행한 뒤 Ports의 8809를 다시 엽니다.

```bash
bash .devcontainer/start.sh
```

## 데이터와 비용

- ANA의 메모·작업·원장은 저장소의 `.ana/`에 저장됩니다. Claude 로그인과 세션 기록은 Git 저장소 밖의 `/workspaces/.ana-private/`에 보관합니다. 로그인 정보와 개인 대화는 GitHub에 커밋하지 않습니다.
- `/workspaces`는 Codespace 중지·재시작 및 컨테이너 재빌드에도 유지되는 위치입니다. **Codespace를 삭제하면 미백업 데이터도 삭제됩니다.** 코드 백업과 개인 데이터 백업은 별개입니다.
- 일정 시간 사용하지 않으면 Codespace가 자동 중지되고 ANA와 에이전트도 멈춥니다. 상시 실행 서버로 제공하는 구성은 아닙니다.
- Claude 이용료와 Codespaces 이용료는 별개입니다. GitHub 계정의 포함 사용량을 넘으면 컴퓨팅·저장소 비용이 발생할 수 있습니다. 중지된 Codespace도 저장소를 차지합니다.
- 에이전트가 다루는 파일은 클라우드 환경 안의 파일입니다. 사용자 PC 파일이 자동으로 연결되지는 않습니다.

## 문제가 생겼을 때

| 증상 | 확인할 곳 |
|---|---|
| `Recovery mode`가 표시됨 | 컨테이너 생성 실패입니다. 생성 로그를 확인합니다. 정상 설치 완료로 간주하지 않습니다. |
| Claude가 로그인/초기 안내에서 멈춤 | `bash .devcontainer/connect.sh`에서 안내를 완료합니다. |
| 채팅이 `Agent input line is not ready`로 실패 | Claude 터미널에 로그인·폴더 신뢰·선택 창이 남아 있는지 확인합니다. |
| ANA 주소가 열리지 않음 | Codespace 실행 상태와 Ports의 8809를 확인합니다. 로컬 PC의 `localhost:8809` 주소가 아닙니다. |
| 다른 계정에서 접속 불가 | Private 포트는 해당 Codespace 접근 권한이 필요합니다. 본인의 GitHub 계정을 확인합니다. |

참고: [GitHub 포트 전달](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace), [재빌드와 데이터 유지](https://docs.github.com/en/codespaces/developing-in-a-codespace/rebuilding-the-container-in-a-codespace), [Codespaces 비용](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces), [Claude 로그인](https://code.claude.com/docs/en/authentication).
