# 브라우저에서 ANA 시작하기 — 검증 중

이 브랜치는 Codespaces 실행 검증용입니다. 공개 배포 안내는 검증 후 확정합니다.

1. Codespace 생성이 완료될 때까지 기다립니다.
2. Terminal → New Terminal에서 `bash .devcontainer/connect.sh`를 실행합니다.
3. Claude Code 초기 안내와 로그인을 완료합니다. 로그인 주소를 브라우저에서 열고, 인증 코드가 나오면 터미널에 붙여 넣습니다.
4. 프로젝트 폴더 신뢰 여부를 확인합니다. `Ctrl+B`를 누르고 손을 뗀 뒤 `D`를 눌러 터미널에서 빠져나옵니다.
5. Ports에서 ANA(8809)의 지구본 아이콘으로 대시보드를 엽니다. 공개 범위는 **Private**을 유지합니다.
6. ANA 채팅에서 인사를 보내 응답을 확인합니다.

ANA 데이터는 저장소의 `.ana/`, Claude 로그인과 기록은 `/workspaces/.ana-private/`에 저장합니다. 둘 다 Git에 올리지 않습니다. Codespace를 삭제하면 이 데이터도 삭제됩니다.
