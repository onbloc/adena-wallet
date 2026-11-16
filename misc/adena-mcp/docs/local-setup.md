# adena-mcp 로컬 설정 가이드

배포 전에 이 저장소의 소스로 Adena, agent host, MCP 서버를 연결해 동작을 확인하는 방법입니다.

```
Claude Code ──MCP──▶ adena-mcp ──~/.adena-agent/agent.sock──▶ adena-agent-host ◀──native messaging── Adena(개발 빌드)
```

## 0. 준비물

| 항목 | 버전 | 확인 명령 |
|---|---|---|
| Go | 1.25 이상 | `go version` |
| Node.js / Yarn | Node 18 이상 (npx 방식만) | `node -v` |
| 브라우저 | Chrome, Chromium, Brave, Edge 중 하나 | |
| OS | macOS 또는 Linux | |

이 기능은 아직 스토어 버전 Adena에 없습니다. 그래서 1단계의 개발 빌드가 필요합니다.

## 1. Adena 개발 빌드 로드

```sh
# from the repository root
yarn setup
yarn build:module
yarn workspace adena-extension build      # writes packages/adena-extension/dist
```

1. `chrome://extensions`를 열고 **개발자 모드**를 켭니다.
2. **압축해제된 확장 프로그램 로드**를 눌러 `packages/adena-extension/dist`를 선택합니다.
3. ID는 복사하지 않아도 됩니다. 2단계의 host 설치가 로드된 개발 빌드를 자동으로 찾습니다. 같은 폴더를 다시 로드하면 ID는 유지됩니다.
4. 스토어 버전 Adena가 설치되어 있다면, 충돌하지 않도록 테스트하는 동안 꺼 두세요.

## 2. adena-mcp 설치

방법은 둘 중 하나를 고릅니다. **A는 개발 중 반복 테스트용**이고, **B는 배포될 npm 패키지를 그대로 시험할 때** 씁니다.

### 방법 A: 소스에서 빌드

```sh
cd misc/adena-mcp
make build-all                                         # bin/adena-mcp, bin/adena-agent-host
./bin/adena-agent-host install      # 로드된 개발 빌드를 자동으로 찾아 허용
claude mcp add adena -- "$(pwd)/bin/adena-mcp"
```

### 방법 B: 로컬 npm 패키지 (npx)

```sh
cd misc/adena-mcp
make npm-pack NPM_VERSION=0.0.0-local NPM_PLATFORMS=darwin-arm64   # Intel Mac: darwin-x64, Linux: linux-x64 / linux-arm64

PKG="$(pwd)/npm/dist"
npx -y --package="$PKG/adena-wallet-mcp-darwin-arm64-0.0.0-local.tgz" \
       --package="$PKG/adena-wallet-mcp-0.0.0-local.tgz" \
       adena-mcp install-host

claude mcp add adena -- npx -y \
  --package="$PKG/adena-wallet-mcp-darwin-arm64-0.0.0-local.tgz" \
  --package="$PKG/adena-wallet-mcp-0.0.0-local.tgz" adena-mcp
```

- `install-host`는 host 바이너리를 `~/.adena-agent/bin/`에 복사한 뒤 브라우저에 등록합니다. npx 캐시 경로는 바뀔 수 있어서, manifest가 고정된 위치를 가리키게 하려는 것입니다.
- 배포 후에는 `npx -y @adena-wallet/mcp install-host`, `claude mcp add adena -- npx -y @adena-wallet/mcp`로 줄어듭니다.

### 공통 참고

- `install-host`(또는 `adena-agent-host install`)가 허용하는 확장 ID는 다음과 같습니다.
  - 스토어 버전 Adena ID는 항상 허용합니다.
  - 브라우저 프로필(`Secure Preferences`)에서 압축해제로 로드된 Adena 빌드를 찾아 자동으로 추가합니다. 출력의 `allowing unpacked build ...` 줄에서 확인할 수 있습니다.
  - 아직 로드하지 않은 빌드는 `-extension-path <dist 폴더>`로 지정합니다. Chrome과 같은 방식으로 폴더 경로에서 ID를 계산합니다.
  - 그 밖의 ID는 `-chrome-extension-id <ID>`로 직접 넣습니다. 자동 탐지를 끄려면 `-detect=false`를 씁니다.
  - 개발 빌드를 다른 폴더에서 다시 로드하면 ID가 바뀌므로, 설치를 다시 실행하세요.
- 설치 결과는 브라우저별 manifest 파일입니다. macOS Chrome 기준 경로는 `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/xyz.onbloc.adena_agent.json`이고, 안의 `allowed_origins`에서 ID를 확인할 수 있습니다.
- `claude mcp add`는 기본적으로 **현재 디렉터리 프로젝트(local 범위)**에만 등록됩니다. 모든 프로젝트에서 쓰려면 `--scope user`를 붙이세요. 이미 같은 이름이 있으면 `claude mcp remove adena -s local` 후 다시 등록합니다.

## 3. Adena에서 연결 켜기

1. Adena를 잠금 해제합니다.
2. **Settings → Security & Privacy → AI Agent Connection**에서 토글을 켜고, 권한 요청(네이티브 애플리케이션과 통신)을 허용합니다.
3. 상태 표시를 확인합니다.
   - `Connected`가 보이면 연결된 것입니다.
   - `Reload Adena to finish turning on the agent connection.`이 보이면 버튼을 눌러 Adena를 다시 로드하고 잠금 해제합니다. 권한은 받았지만, 이미 실행 중이던 background가 아직 그 권한을 쓰지 못하는 상태입니다.

## 4. 동작 확인

Claude Code를 **새로 시작**한 뒤 차례로 요청합니다.

1. "get_status 실행해줘" → `state`가 `ready`가 아니면 `next_step` 안내가 나옵니다.
2. "connect_wallet 해줘" → Adena에 연결 승인 팝업이 뜹니다. 요청자는 클라이언트 이름(예: `claude-code.agent`)으로 표시됩니다. 승인하면 Connected Apps에 추가됩니다.
3. "bank/send 권한으로 30분짜리 세션 만들어줘" → Adena 승인 팝업이 뜨고, 승인하면 세션이 생성됩니다.
4. "내 다른 주소 g1...로 1000ugnot 보내줘" → `send_transaction`이 팝업 없이 세션 키로 서명해 실행합니다.
5. (선택) "이번 송금은 Adena에서 직접 승인할게" → `signer: "wallet"`로 요청하면 트랜잭션 승인 팝업이 뜹니다. 패키지 배포(`/vm.m_addpkg`)는 항상 이 방식입니다. 먼저 AI Agent Connection 화면에서 **Allow master account requests**를 켜야 합니다(기본값은 꺼짐).
6. "세션 폐기해줘" → Adena 폐기 승인 팝업이 뜨고, 승인하면 세션 키가 파기됩니다.

세션은 Adena의 현재 계정과 네트워크로 만들어지고, 수수료는 그 계정에서 나갑니다. 테스트넷이나 로컬 체인에서 시험하는 것을 권장합니다.

### 로컬 체인(gnodev)으로 시험하기 (선택)

```sh
gnodev local          # RPC http://127.0.0.1:26657, chain id "dev"
```

- Adena 네트워크를 **Local**(`http://127.0.0.1:26657`)로 바꿉니다.
- gnodev가 미리 자금을 넣어 둔 `test1` 계정을 Adena에 가져옵니다. 니모닉은 gno 저장소 문서에 공개되어 있습니다. 실제 자금에는 절대 쓰지 마세요.
- 그다음 4단계를 진행합니다.

## 5. 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `Not connected: chrome.runtime.connectNative is not a function` 또는 Reload 안내 | 권한을 받기 전에 실행된 background | 설정 화면의 Reload 버튼, 또는 `chrome://extensions`에서 새로고침 |
| `Specified native messaging host not found.` | host manifest가 없음 | 2단계 `install-host`(또는 `adena-agent-host install`)를 다시 실행 |
| `Access to the specified native messaging host is forbidden.` | manifest에 현재 확장 ID가 없음 (빌드를 로드하기 전에 설치했거나 폴더가 바뀜) | 개발 빌드를 로드한 상태에서 설치를 다시 실행 (또는 `-extension-path`) |
| `Native host has exited.` | host가 바로 종료됨. 다른 브라우저 프로필이 이미 소켓을 사용 중일 수 있음 | 다른 프로필의 연결을 끄거나 그 브라우저를 종료 |
| `get_status`가 `adena_unreachable` | 브라우저가 꺼져 있거나 연결 토글이 꺼져 있음 | 브라우저를 열고 3단계를 확인 |
| `get_status`가 `host_not_installed` | host가 등록되지 않음 | `connect_wallet` 호출(자동 설치) 또는 2단계 실행 |
| `not_connected` | 이 클라이언트가 Adena에 연결 승인되지 않음 | `connect_wallet` 호출 후 Adena에서 승인 |
| `session_required` | 메시지를 모두 허용하는 세션이 없음 | 오류에 나온 `required_allow_paths`로 세션 생성, 또는 `signer: "wallet"` |
| `master_requests_disabled` | Master 계정 직접 요청 허용이 꺼져 있음 | 세션을 사용하거나, AI Agent Connection 화면에서 Allow master account requests 켜기 |
| `wallet_signature_required` | 세션으로 서명할 수 없는 메시지(`/vm.m_addpkg`) | `signer: "wallet"`로 다시 요청 |
| `wallet_locked` | Adena가 잠김 | 잠금 해제 후 재시도 |
| `approval_timeout` | 5분 안에 승인하지 않음 | 다시 요청 (`ADENA_MCP_APPROVAL_TIMEOUT`으로 조정 가능) |
| `session_key_lost` | MCP가 재시작되어 메모리의 세션 키가 사라짐 | `revoke_session`으로 폐기하고 새 세션 생성 |
| `session_spend_limit` | 수수료와 송금액 합계가 지출 한도를 넘음 | 더 큰 `spend_limit`으로 새 세션 생성 |

로그 위치
- Adena background: `chrome://extensions` → Adena → **서비스 워커**를 눌러 열리는 DevTools 콘솔
- adena-mcp: Claude Code의 MCP 로그. stderr로 JSON 로그를 남깁니다.
- 소켓과 기록: `~/.adena-agent/agent.sock`, `~/.adena-agent/mcp/sessions.json`. 기록에는 공개 정보만 있습니다.

## 6. 정리

```sh
# 1. Revoke any session that is still active (ask Claude Code: "revoke_session 해줘")

# 2. Remove the MCP registration
claude mcp remove adena -s local

# 3. Remove the host
./bin/adena-agent-host uninstall                      # 방법 A
npx -y --package=... adena-mcp uninstall-host         # 방법 B (설치 때와 같은 --package 인자)

# 4. Remove local data
rm -rf ~/.adena-agent
```

마지막으로 Adena 설정에서 AI Agent Connection 토글을 끕니다. 세션 키는 디스크에 저장되지 않습니다. 그래서 폐기하지 않은 세션은 Adena의 세션 관리 화면에서 폐기하거나, 만료(기본 1시간)되기를 기다리면 됩니다.
