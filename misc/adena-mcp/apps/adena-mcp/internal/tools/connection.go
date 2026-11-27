package tools

import (
	"context"
	"errors"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// requireLiveConnection asks Adena, before each session signature, whether
// this process is still connected. Turning the agent connection off or
// removing the agent under Connected Apps then pauses this server's sessions
// at once, although they stay valid on chain until revoked or expired.
func requireLiveConnection(ctx context.Context, d *Deps) error {
	callCtx, cancel := context.WithTimeout(ctx, statusTimeout)
	defer cancel()

	var status bridge.Status

	err := d.Bridge.Call(callCtx, bridge.MethodGetStatus, agentParams(ctx), &status)
	if err != nil {
		var remote *bridge.Error
		if errors.As(err, &remote) && remote.Code == bridge.CodeHostUnavailable {
			return &server.ToolError{
				Code: "adena_unreachable",
				Message: "sessions sign only while Adena runs with the agent connection on, so it can stop " +
					"them: ask the user to open the browser with Adena and turn on Settings > Security & " +
					"Privacy > AI Agent Connection. Turning it off does not revoke sessions on chain",
			}
		}

		return bridgeError(err)
	}

	if !status.HasWallet || !status.Connected {
		return &server.ToolError{
			Code: "not_connected",
			Message: "Adena no longer has this agent connected (the agent connection was turned off or the " +
				"agent was removed under Connected Apps), so its sessions are paused. Ask the user before " +
				"calling connect_wallet again",
		}
	}

	return nil
}
