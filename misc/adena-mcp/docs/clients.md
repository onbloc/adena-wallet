# AI 클라이언트별 설정

모든 클라이언트가 같은 MCP 서버(`npx -y @adena-wallet/mcp`)를 실행합니다. 클라이언트마다 다른 것은 등록 방법뿐입니다.

## 공통 준비

1. **Adena 설치**: AI Agent Connection을 지원하는 버전이 필요합니다.
2. **Adena에서 연결 켜기**: Settings → Security & Privacy → **AI Agent Connection**을 켭니다.
3. **Agent host 설치**: 클라이언트에서 처음 `connect_wallet`을 호출하면 자동으로 설치됩니다. 미리 설치하려면 아래 명령을 실행합니다.
   ```sh
   npx -y @adena-wallet/mcp install-host
   ```

연결 승인은 **클라이언트마다 따로** 받습니다. 에이전트 이름이 MCP 클라이언트 이름(예: `claude-code`, `cursor`)으로 정해지기 때문입니다. Adena의 Connected Apps에는 `agent://<이름>.agent`로 표시되고, 거기서 연결을 해제할 수 있습니다.

## Claude Code

**플러그인 (권장)**: MCP 서버와 `adena` 스킬이 함께 설치됩니다.
```sh
claude plugin marketplace add onbloc/adena-wallet
claude plugin install adena@adena
```
세션 안에서는 `/plugin marketplace add onbloc/adena-wallet`, `/plugin install adena@adena`로도 할 수 있습니다.

**MCP만 등록**
```sh
claude mcp add --scope user adena -- npx -y @adena-wallet/mcp
```

설치 후 Claude Code를 다시 시작하고 `claude mcp list`로 확인합니다.

## Codex CLI

**MCP 등록**
```sh
codex mcp add adena -- npx -y @adena-wallet/mcp
```

또는 `~/.codex/config.toml`에 직접 추가합니다.
```toml
[mcp_servers.adena]
command = "npx"
args = ["-y", "@adena-wallet/mcp"]
```

**플러그인**: `misc/adena-mcp/plugin/.codex-plugin/plugin.json`이 같은 MCP 설정과 스킬을 가리킵니다. Codex 플러그인 마켓플레이스 등록 방식은 Codex 버전에 따라 다르므로, 배포 시점에 확인한 뒤 추가합니다.

## Cursor

**플러그인**: 저장소 루트의 `.cursor-plugin/marketplace.json`이 `misc/adena-mcp/plugin`을 가리킵니다. 플러그인 루트의 `mcp.json`은 자동으로 인식됩니다.

**MCP만 등록**: `~/.cursor/mcp.json`(전역) 또는 프로젝트의 `.cursor/mcp.json`에 추가합니다.
```json
{
  "mcpServers": {
    "adena": {
      "command": "npx",
      "args": ["-y", "@adena-wallet/mcp"]
    }
  }
}
```

## OpenCode

`opencode.json`(전역 또는 프로젝트)에 추가합니다.
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "adena": {
      "type": "local",
      "command": ["npx", "-y", "@adena-wallet/mcp"],
      "enabled": true
    }
  }
}
```

## Gemini CLI

`~/.gemini/settings.json`에 추가합니다.
```json
{
  "mcpServers": {
    "adena": {
      "command": "npx",
      "args": ["-y", "@adena-wallet/mcp"]
    }
  }
}
```

`misc/adena-mcp/plugin/gemini-extension.json`은 MCP 서버와 컨텍스트(`GEMINI.md`)를 묶은 확장 정의입니다.

## Claude Desktop

`claude_desktop_config.json`에 추가합니다. macOS에서는 `~/Library/Application Support/Claude/claude_desktop_config.json`입니다.
```json
{
  "mcpServers": {
    "adena": {
      "command": "npx",
      "args": ["-y", "@adena-wallet/mcp"]
    }
  }
}
```

## VS Code (GitHub Copilot)

프로젝트의 `.vscode/mcp.json`에 추가합니다.
```json
{
  "servers": {
    "adena": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@adena-wallet/mcp"]
    }
  }
}
```

## Windsurf

`~/.codeium/windsurf/mcp_config.json`에 추가합니다.
```json
{
  "mcpServers": {
    "adena": {
      "command": "npx",
      "args": ["-y", "@adena-wallet/mcp"]
    }
  }
}
```

## 배포 전 로컬 패키지로 시험하기

npm에 배포하기 전에는 `npx -y @adena-wallet/mcp`를 로컬 바이너리 경로로 바꿔 등록합니다. 자세한 방법은 [로컬 설정 가이드](local-setup.md)에 있습니다.
```json
{ "command": "/absolute/path/to/misc/adena-mcp/bin/adena-mcp", "args": [] }
```

## 동작 확인

어느 클라이언트든 다음 순서로 확인합니다.
1. "get_status 실행해줘": `state`가 `ready`인지 확인합니다. 아니라면 `next_step` 안내를 따릅니다.
2. "connect_wallet 해줘": Adena에서 연결을 승인합니다.
3. "bank/send 권한으로 30분짜리 세션 만들어줘" → "g1…로 1000ugnot 보내줘" → "세션 폐기해줘"
