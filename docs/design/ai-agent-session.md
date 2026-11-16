# AI 에이전트용 세션 어카운트 설계 (Adena Extension)

> 상태: Draft · 작성일: 2026-11-16
> 대상 체인 기능: gno account sessions (`tm2/adr/adr-002-session-subaccounts.md`, `gno.land/adr/adr-001-session-subaccounts.md`)

## 0. 구현 현황

아래 설계 중 다음이 구현되었다. 원래 제안과 달라진 점도 함께 적는다.

| 영역 | 구현 | 위치 |
|---|---|---|
| 통신 채널 | Phase 1을 localhost bridge 대신 **Native Messaging**으로 구현 | §4.1 |
| Adena | 선택 권한 `nativeMessaging`, background bridge, `ping`/`get_account`/`create_session`/`revoke_session` 처리, 에이전트 세션 정책 | `packages/adena-extension/src/inject/agent-host/` |
| Adena 설정 | Security & Privacy → AI Agent Connection 토글과 연결 상태 표시 | `pages/popup/certify/agent-connection` |
| Native host | `adena-agent-host`: 소켓 ↔ native messaging 중계, 브라우저별 manifest 설치·제거 | `misc/adena-mcp/apps/adena-agent-host` |
| MCP 서버 | `adena-mcp`: 세션 생성·조회·폐기, `adena_call`/`adena_run`/`adena_send` | `misc/adena-mcp/apps/adena-mcp` |
| 세션 키 보호 | gnokey를 쓰지 않고 프로세스 안에서 서명. 니모닉 없이 잠긴 메모리(memguard)에서만 키 생성·사용, 디스크·로그·도구 응답에 미노출, core dump·디버거 부착 차단 | `apps/adena-mcp/internal/{sessionkey,hardening,chain}` |

원래 설계와 다른 점 / 아직 안 된 것
- 승인 화면은 전용 `ApproveAgentSession`을 만들지 않았다. 기존 트랜잭션 승인 팝업을 재사용한다.
  - 요청자는 `<agent_name>.agent`로 표시된다.
  - 위험 권한 강조와 hold 확인은 미구현이다(§5.3).
- `window.adena` inject API(§5.1)는 만들지 않았다. 에이전트 요청은 native host로만 받는다.
- `GetAgentSessions`와 세션 메타데이터 확장(`source: 'agent'` 등)은 미구현이다.
  - 에이전트 세션은 체인 동기화로 기존 세션 관리 화면에 나타날 것으로 예상하지만, 실제 확인은 하지 않았다.
- §3.1 보안 갭(외부 `DoContract`의 세션 관리 메시지, payload `hostname` 위조)은 이번 작업에서 고치지 않았다.
- Native host 자동 설치는 macOS/Linux만 지원한다. Windows는 레지스트리 등록이 필요하다.
- 원래 설계(§7.2, §8)는 에이전트가 gnokey로 트랜잭션을 실행하는 방식이었다. 구현에서는 gnokey 의존성을 없애고 키를 노출하지 않기 위해 `adena-mcp`가 직접 서명한다.
- 그 결과 세션 키는 프로세스 재시작 시 사라진다. 해당 세션은 폐기하거나 만료되게 둔다.

## 1. 목표

AI 에이전트가 사용자의 마스터 키를 갖지 않고도 사용자를 대신해 gno.land DApp 트랜잭션을 실행하게 한다.

| 단계 | 주체 | 서명자 | 비고 |
|---|---|---|---|
| ① 세션 생성 | 에이전트가 요청, 사용자가 Adena에서 승인 | 마스터 (Adena) | `/auth.m_create_session` |
| ② 트랜잭션 실행 | 에이전트 | 세션 키 (gnokey) | `MsgCall.caller = master`, `Signature.session_addr = session` |
| ③ 세션 종료 | 에이전트가 요청, 사용자가 Adena에서 승인 | 마스터 (Adena) | `/auth.m_revoke_session` |

핵심 원칙
- 세션 **개인키는 에이전트 쪽(gnokey keybase)에서만 생성·보관**한다. Adena에는 공개키만 전달된다.
- Adena는 ①과 ③의 **마스터 서명 + 사용자 승인 UI**만 담당한다. ②에는 관여하지 않는다.
- 피해 범위는 체인이 강제하는 `AllowPaths` / `SpendLimit` / `ExpiresAt`로 제한된다.

## 2. 체인 측 사실 (설계 전제)

| 항목 | 값 / 동작 | 출처 |
|---|---|---|
| 메시지 | `MsgCreateSession{creator, session_key, expires_at, allow_paths, spend_limit, spend_period}`, `MsgRevokeSession{creator, session_key}`, `MsgRevokeAllSessions{creator}` | `tm2/pkg/sdk/auth/msgs.go` |
| Amino type | `/auth.m_create_session`, `/auth.m_revoke_session`, `/auth.m_revoke_all_sessions` | `tm2/pkg/sdk/auth/package.go` |
| AllowPaths 문법 | `*` \| `vm/exec[:<realm>]` \| `vm/run` \| `bank/send` \| `bank/multisend`. 비어 있으면 거부, 최대 8개 | gno.land ADR-001 |
| 항상 거부 | `auth/*` (세션은 스스로 세션 생성·폐기 불가), `vm/add_package` | gno.land ADR-001 |
| SpendLimit | 가스비 포함 모든 출금에 적용. `ugnot`이 없으면 가스비를 낼 수 없음. 환불을 받아도 한도는 복구되지 않음 (high-water mark) | tm2 ADR-002 |
| 상한 | 계정당 세션 16개, 기간 최대 약 4년, `spend_period` 최대 30일 | `tm2/pkg/std/account.go` |
| 조회 | `auth/accounts/{master}/sessions`, `auth/accounts/{master}/session/{addr}` | tm2 ADR-002 |
| gnokey 지원 | `gnokey maketx session create/revoke/revokeall`, `gnokey maketx call ... --master <g1master> <session-key>` | `tm2/pkg/crypto/keys/client/maketx.go`, `session_*.go` |

**중요한 결론:** 세션 키로는 `MsgRevokeSession`에 서명할 수 없다. 따라서 ③ Revoke는 반드시 **마스터 서명(사용자 개입)**이 필요하다. 에이전트가 비정상 종료하는 경우에 대비해 **짧은 `expires_at`이 최종 안전장치**가 된다.

## 3. 현재 Adena 구현 현황

세션 관련 기능은 이미 대부분 구현되어 있다.

| 영역 | 현재 상태 | 위치 |
|---|---|---|
| Proto / endpoint | `gno-js-client@3.1.0`에 `MsgCreateSession` 등 포함 | `adena-module/src/proto/session-types.ts`, `adena-module/src/utils/session-message-endpoints.ts` |
| 인코딩 / 디코딩 | 구현됨 | `adena-module/src/utils/messages.ts` (`encodeMessageValue`, `decodeTxMessages`) |
| `session_addr` 서명 필드 | `tm2-js-client@3.3.0`에 반영됨 | — |
| 메시지 빌더 / 검증 | AllowPaths, 만료, 기간, 한도 검증 | `adena-extension/src/services/transaction/message/auth/auth.ts` |
| 승인 UI | 일반 트랜잭션 승인 화면에서 세션 메시지를 표시 | `pages/popup/wallet/approve-transaction-main`, `components/molecules/approve-transaction-message` |
| 세션 저장 / 관리 | `SessionRepository` (`SESSIONS` 키), 관리·폐기 화면 | `repositories/session/session-repository.ts`, `pages/popup/wallet/revoke-session` |
| 내부 세션 생성 흐름 | 지갑이 키를 직접 생성하고 `approveSessionViaPopup`으로 승인 | `pages/web/session-add-screen/index.tsx` |
| 외부 요청 경로 | `DoContract`로 세션 메시지를 보낼 수 있음 (아래 보안 갭 참고) | `inject/executor/executor.ts`, `common/validation/validation-transaction.ts` |

### 3.1 발견된 보안 갭 (선행 수정 권장)

1. **연결된 DApp이면 누구나 `DoContract`로 `m_create_session`을 보낼 수 있다.** 사용자에게는 일반 트랜잭션처럼 보인다. `validateInjectionTransactionType`의 주석은 "지갑 웹 UI에서 시작된 경우"를 가정하지만, 이를 강제하는 코드는 없다.
   - 피싱 DApp이 자신의 공개키로 `allow_paths: ["*"]` 세션을 요청할 수 있다.
2. **요청의 `hostname`/`protocol`을 페이지가 정한다.** `executor.ts`의 page context에서 `window.location`으로 값을 채우고, `content.ts`가 `event.data`를 그대로 전달한다. 악성 페이지는 `hostname: 'adena-wallet'`이나 다른 사이트를 사칭할 수 있다.
   - 이 문제는 `checkEstablished`에도 영향을 줄 수 있으므로 별도로 확인해야 한다.

권장 조치
- background에서 출처를 `sender.origin` 또는 `sender.tab.url`로 다시 계산하고, payload의 `hostname`/`protocol`은 무시한다.
- 외부 경로인 `DoContract`, `SignTx`, `Sign`에서는 세션 관리 메시지 3종을 거부한다. 이 메시지들은 새 전용 API(§5)로만 받는다.
- 지갑 내부 흐름은 extension 페이지에서 직접 보내므로 영향이 없다. `sender.url`이 `chrome-extension://<id>/`인지 확인하면 된다.

## 4. 전체 아키텍처

```
┌──────────────────────────┐        ┌────────────────────────────┐        ┌───────────┐
│ AI Agent (CLI / MCP)     │        │ Adena Extension            │        │ gno.land  │
│                          │        │                            │        │  chain    │
│ ┌──────────────────────┐ │ ①req   │ ┌────────────────────────┐ │        │           │
│ │ adena-agent-bridge   │─┼───────▶│ │ Agent Session API      │ │ ①tx    │           │
│ │ (localhost / native) │◀┼────────┼─│ + ApproveAgentSession  │─┼───────▶│ auth      │
│ └──────────────────────┘ │ ①resp  │ └────────────────────────┘ │        │ session   │
│ ┌──────────────────────┐ │        │ ┌────────────────────────┐ │ ③tx    │ store     │
│ │ gnokey keybase       │ │        │ │ SessionRepository      │─┼───────▶│           │
│ │ (session privkey)    │─┼────────┼─┼────────────────────────┼─┼───────▶│ vm/bank   │
│ └──────────────────────┘ │ ②tx (gnokey maketx call --master)│ │        │           │
└──────────────────────────┘        └────────────────────────────┘        └───────────┘
```

### 4.1 에이전트 ↔ Adena 통신 채널

브라우저 확장은 CLI 프로세스가 직접 호출할 수 없으므로 중계 채널이 필요하다.

| 방식 | 구성 | 장점 | 단점 |
|---|---|---|---|
| **A. Localhost Bridge Page (Phase 1 권장)** | 에이전트가 `http://127.0.0.1:<port>`에 작은 웹 페이지를 띄우고 브라우저로 연다. 페이지는 `window.adena.*`를 호출하고 결과를 로컬 서버로 POST한다 | 확장의 권한·매니페스트를 바꿀 필요가 없다. 기존 injection 파이프라인과 establish 모델을 재사용한다 | 브라우저 탭이 한 번 열린다. 일회성 토큰으로 로컬 포트를 보호해야 한다 |
| B. Chrome Native Messaging (Phase 2) | 확장에 `nativeMessaging` 권한을 추가하고, 에이전트 측 host 바이너리와 매니페스트를 설치한다 | 탭이 필요 없어 UX가 매끄럽다 | 권한 추가로 스토어 심사가 필요하고, OS별 설치가 필요하다 |
| C. `externally_connectable` | 특정 도메인만 `onMessageExternal`로 받는다 | — | localhost 와일드카드는 권장되지 않는다. 결국 A와 비슷하다 |

초안에서는 Phase 1을 A로 제안했다. 실제 구현은 **B(Native Messaging)**로 바로 진행했다.
- 브라우저 탭이 필요 없고, 확장 페이지가 아닌 일반 웹 origin을 거치지 않는다.
- `nativeMessaging`은 선택 권한(`optional_permissions`)으로 두었다. 기존 사용자의 업데이트가 권한 경고로 멈추지 않게 하기 위해서다.

구성은 다음과 같다. 프로토콜은 `misc/adena-mcp/README.md`에 정리했다.

```
AI agent ──MCP stdio──▶ adena-mcp ──~/.adena-agent/agent.sock──▶ adena-agent-host ◀──native messaging── Adena
```

## 5. Adena 신규 API 설계

### 5.1 Inject API (`window.adena`)

```ts
// Request
interface RequestAgentSessionParams {
  sessionPublicKey: string;   // bech32 gpub… (secp256k1, from `gnokey list`)
  allowPaths: string[];       // e.g. ["vm/exec:gno.land/r/gnoswap/v1/router"]
  spendLimit: string;         // e.g. "5000000ugnot" (must include ugnot for gas)
  spendPeriod?: number;       // seconds, 0 = lifetime cap
  expiresAt: number;          // unix seconds, required (> now, <= now + policy max)
  agent: {
    name: string;             // e.g. "Claude Code"
    description?: string;     // task summary shown to the user
  };
}

interface RequestAgentSessionResponse {
  chainId: string;
  masterAddress: string;      // g1… (current account)
  sessionAddress: string;     // g1… derived from sessionPublicKey
  txHash: string;
  expiresAt: number;
}

interface RevokeAgentSessionParams {
  sessionPublicKey?: string;  // one of the two
  sessionAddress?: string;
}

window.adena.RequestAgentSession(params): Promise<AdenaResponse<RequestAgentSessionResponse>>;
window.adena.RevokeAgentSession(params): Promise<AdenaResponse<{ txHash: string }>>;
window.adena.GetAgentSessions(): Promise<AdenaResponse<AgentSessionInfo[]>>; // sessions this origin created
```

- 새 `WalletResponseType` 문자열은 `REQUEST_AGENT_SESSION`, `REVOKE_AGENT_SESSION`, `GET_AGENT_SESSIONS`이다. SDK enum이 갱신될 때까지는 기존 관례대로 문자열 캐스트를 사용한다.
- establish가 필요하다. 연결되지 않은 origin이면 먼저 `AddEstablish`를 거친다.

### 5.2 변경·추가 파일

| 레이어 | 작업 | 파일 |
|---|---|---|
| Inject | 메서드 3개 추가 | `src/inject.ts`, `src/inject/executor/executor.ts` |
| Background 라우팅 | 요청 타입 분기 추가 | `src/inject/message/message-handler.ts` |
| Handler | `requestAgentSession`, `revokeAgentSession`, `getAgentSessions` | `src/inject/message/methods/agent-session.ts` (신규), `methods/index.ts` |
| 출처 검증 | `sender` 기반으로 origin 재계산 (§3.1) | `src/background.ts`, `methods/common.ts` |
| 외부 경로 차단 | `DoContract`/`Sign`에서 세션 관리 메시지는 extension origin만 허용 | `common/validation/validation-transaction.ts` |
| 메시지 생성 | 기존 `createMessageOfCreateSession`/`RevokeSession` 재사용. bech32 `gpub` → bytes 변환 헬퍼 추가 | `services/transaction/message/auth/auth.ts` |
| 정책 검증 | 에이전트용 정책 (§6) | `services/transaction/agent-session-policy.ts` (신규) |
| 라우트 | `ApproveAgentSession`, `ApproveRevokeAgentSession` | `src/types/router.ts`, `src/router/popup/index.tsx` |
| 승인 UI | 전용 화면 (§5.3) | `pages/popup/wallet/approve-agent-session/` (신규) |
| 저장 | `SessionMetadata`에 `source: 'agent'`, `origin`, `agentName`, `taskDescription` 추가. 마이그레이션 필요 | `repositories/session/session-repository.ts`, `migrates/migrations/v0xx` |
| 관리 UI | 세션 목록에 에이전트 배지, origin, 만료까지 남은 시간, 남은 한도 표시 | `pages/popup/wallet/manage-sessions` 계열 |
| 서명 가드 | 에이전트 세션은 Adena가 개인키를 갖지 않으므로 "서명 가능한 계정"으로 import하지 않는다 | `services/transaction/session-signing-guard.ts`, `wallet-session.ts` |

### 5.3 승인 화면 (ApproveAgentSession)

일반 트랜잭션 화면을 재사용하지 않고, 위험도를 강조하는 전용 화면을 만든다.

- 헤더에는 요청 origin(예: `127.0.0.1:53412`)과 에이전트 이름·작업 설명을 표시하고, "AI 에이전트가 당신의 계정으로 트랜잭션을 실행할 권한을 요청합니다"라고 안내한다.
- 권한 목록은 AllowPaths를 사람이 읽을 수 있게 풀어서 보여준다.
  - `vm/exec:gno.land/r/foo` → "`gno.land/r/foo`와 하위 realm 함수 호출"
  - `vm/run` → "임의 코드 실행 (모든 realm 호출 가능)" ⚠️
  - `bank/send` → "임의 주소로 토큰 전송" ⚠️
  - `*` → "auth와 패키지 배포를 제외한 모든 권한" ⛔
- 한도와 기간은 `spendLimit`(가스비 포함임을 명시), `spendPeriod`, 만료 시각과 남은 시간으로 보여준다.
- 세션 주소와 공개키는 축약해서 보여주고, 복사할 수 있게 한다.
- 가스비 표시는 기존 `session-admin-static-fee.ts`를 재사용한다.
- 위험 권한(`*`, `vm/run`, `bank/send`)이 있거나 만료가 24시간을 넘으면 `requiresHoldConfirmation`(길게 눌러 승인)을 적용한다.
- 승인하면 마스터로 서명하고 브로드캐스트한다. 블록에 포함된 것을 확인한 뒤 `auth/accounts/{master}/session/{addr}`를 조회해 활성 상태를 확인하고 응답한다.

## 6. 에이전트 세션 정책 (Adena 측 기본값)

체인 상한보다 보수적으로 잡는다. 사용자가 설정에서 조정할 수 있게 한다.

| 항목 | 기본 정책 | 근거 |
|---|---|---|
| `expiresAt` | 필수. 0(무기한)은 거부. 기본 최대 24시간, 설정 시 최대 7일 | Revoke가 사용자 개입을 요구하므로 만료가 최종 안전장치가 된다 |
| `allowPaths` | `*`는 기본 거부(설정으로 허용). `vm/run`, `bank/send`는 경고 | `vm/run`은 사실상 모든 realm을 호출할 수 있다 |
| `spendLimit` | `ugnot` 포함 필수. 기본 상한(예: 10 GNOT) 초과 시 경고 | 가스비가 한도에서 차감된다 |
| 세션 개수 | 계정의 활성 세션이 16개에 가까우면 경고하고, 만료된 세션 정리를 안내 | 체인 상한 16개 |
| 계정 타입 | 마스터 가능 계정만 허용(`isSessionMasterAccount`). Ledger / Multisig / 세션 계정은 거부 | 기존 가드와 동일 |
| 네트워크 | `isSessionSupportedNetwork`가 false이면 거부 | 기존 유틸과 동일 |

## 7. 시퀀스

### 7.1 ① 세션 생성

```
Agent                     Bridge Page (127.0.0.1)          Adena                         Chain
  │ gnokey add agent-<id>          │                          │                              │
  │ (secp256k1, keybase)           │                          │                              │
  │ start local server + token ───▶│ open in browser          │                              │
  │                                │ AddEstablish (first time)│                              │
  │                                │─────────────────────────▶│ ApproveEstablish             │
  │                                │ RequestAgentSession ────▶│ policy check                 │
  │                                │                          │ ApproveAgentSession popup    │
  │                                │                          │ (user approves)              │
  │                                │                          │ sign MsgCreateSession ──────▶│
  │                                │                          │ query session ◀──────────────│
  │                                │◀── {master, sessionAddr, txHash, expiresAt}             │
  │◀── POST /callback (token) ─────│                          │ SessionRepository.set(agent) │
```

### 7.2 ② 트랜잭션 실행 (Adena 미관여)

```bash
gnokey maketx call \
  --pkgpath gno.land/r/<dapp>/<realm> \
  --func <Func> --args <arg1> --args <arg2> \
  --send "" \
  --gas-fee 1000000ugnot --gas-wanted 5000000 \
  --master g1<master_address> \
  --remote <rpc> --chainid <chain_id> \
  --broadcast \
  agent-<id>
```

- 에이전트는 실행 전에 `--simulate only`로 가스를 측정하고, `auth/accounts/{master}/session/{addr}`에서 남은 한도를 확인한다.
- DApp별 메시지 구성은 에이전트 몫이다. 권장 방식은 다음과 같다.
  - realm 소스와 함수 시그니처는 `vm/qfile`, `vm/qdoc` 등으로 조회한다.
  - DApp이 에이전트용 액션 명세(함수, 인자, 필요한 AllowPaths)를 공개하면, 세션 요청 시 그 AllowPaths를 그대로 사용할 수 있다.
- 세션 범위 밖의 호출은 체인에서 `session not allowed`로 거부된다. 에이전트는 범위가 더 넓은 새 세션을 요청해야 한다. 세션은 생성 후 수정할 수 없다.

### 7.3 ③ 세션 종료 (Revoke)

```
Agent                         Bridge Page                     Adena                      Chain
  │ task done ──────────────────▶│ RevokeAgentSession ──────────▶│ ApproveRevokeAgentSession   │
  │                              │                               │ sign MsgRevokeSession ─────▶│
  │◀── {txHash} ─────────────────│◀──────────────────────────────│ setStatus(revoked)          │
  │ gnokey delete agent-<id>     │                               │                             │
```

- Revoke는 권한을 줄이는 작업이므로 승인 UI를 단순한 확인 1회로 한다.
- 옵션으로 "이 origin이 만든 세션의 Revoke는 자동 승인" 설정을 둘 수 있다. 다만 마스터 계정이 가스비를 지불하므로, 기본값은 확인 팝업으로 둔다.
- 비정상 종료 대비
  - 에이전트가 Revoke를 호출하지 못해도 `expiresAt`에 자동으로 무효화된다.
  - Adena 세션 관리 화면에서 수동으로 Revoke하거나 Revoke All을 할 수 있다(기존 기능).
  - 만료가 임박했거나 이미 만료된 에이전트 세션은 Adena 목록에서 회색으로 표시하고 정리 버튼을 제공한다.

## 8. 에이전트 측 구성 요소 (`adena-agent-bridge`)

Adena 저장소 밖의 별도 패키지(npm CLI 또는 MCP 서버)로 제공하는 것을 권장한다.

| 기능 | 내용 |
|---|---|
| `session start` | gnokey 키를 생성한다(`gnokey add`, 비밀번호는 에이전트 전용 keybase로 관리). bridge 서버와 페이지를 띄워 `RequestAgentSession`을 호출하고, 결과(`master`, `sessionAddr`, `expiresAt`)를 로컬에 저장한다 |
| `session status` | 체인에서 세션 상태와 남은 한도를 조회한다 |
| `tx call/run/send` | `gnokey maketx ... --master` 래퍼. simulate → 가스 산정 → broadcast 순서로 실행한다 |
| `session end` | `RevokeAgentSession` 호출 후 `gnokey delete`를 실행한다 |
| 보안 | bridge는 `127.0.0.1`에만 바인딩하고, 일회성 토큰과 CSRF 방지를 적용하며, 요청을 1회 처리한 뒤 종료한다 |

참고 구현: gnomcp의 `gno_session_propose` / `gno_session_revoke`. 이 도구들은 `gnokey maketx session create` 명령을 출력해 사용자가 직접 실행하게 한다. 이 설계는 그 수동 단계를 Adena 승인 UI로 대체하는 것이다.

## 9. 구현 단계

1. **Phase 0 — 보안 선행 작업**
   - §3.1의 origin 재계산을 적용한다.
   - 외부 경로에서 세션 관리 메시지를 차단한다.
   - 승인 화면의 오래된 "Testnet 13" 문구를 정리한다.
2. **Phase 1 — Adena API와 UI**
   - `RequestAgentSession`, `RevokeAgentSession`, `GetAgentSessions`를 추가한다.
   - 전용 승인 화면, 정책 검증, 저장소 마이그레이션, 관리 화면 배지를 구현한다.
   - 테스트: 정책 검증, gpub 파싱, origin 위조 거부, establish 미연결 거부.
3. **Phase 2 — `adena-agent-bridge` (localhost)**
   - CLI 또는 MCP 서버로 구현하고 E2E를 검증한다. 시나리오: 테스트넷에서 세션 생성 → `gnokey call --master` → Revoke.
4. **Phase 3 — 선택 사항**
   - Native Messaging 채널을 추가한다.
   - 에이전트 세션 자동 정리, 만료 알림을 추가한다.
   - DApp용 에이전트 액션 명세 표준을 제안한다.

## 10. 미결 사항 / 확인 필요

- 지원 체인: `SESSION_UNSUPPORTED_CHAIN_IDS = []`이지만 실제로 세션이 활성화된 체인(onyx-1, gnoland-1 등)을 RPC로 확인해야 한다.
- 에이전트 세션을 Adena 계정 목록에 "보기 전용"으로 노출할지, 관리 화면에만 둘지 결정해야 한다.
- 승인 화면 문구와 위험 등급 기준을 디자인팀과 맞춰야 한다.
- `@adena-wallet/sdk`에 새 타입과 메서드를 추가하고 배포 일정을 잡아야 한다.
- Revoke 자동 승인 옵션을 제공할지 결정해야 한다.
