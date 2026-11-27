package tools

import (
	"context"
	"fmt"
	"strings"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

func registerConnectWallet(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "connect_wallet",
		Description: "Connects this agent to the user's Adena wallet. Installs the agent host first when it " +
			"is missing, then asks the user to approve the connection in Adena (unlocking it if needed) and " +
			"returns the account. If Adena is not reachable it returns what the user has to do.",
		InputSchema: objectSchema(map[string]any{}),
		Annotations: server.Annotations{Idempotent: true, OpenWorld: true},
		Handler: func(ctx context.Context, _ map[string]any) (server.Result, error) {
			return connectWallet(ctx, d)
		},
	})
}

func connectWallet(ctx context.Context, d *Deps) (server.Result, error) {
	var notes []string

	state, _, err := walletState(ctx, d)
	if err != nil {
		return server.Result{}, err
	}

	if state == stateHostNotInstalled {
		written, installErr := d.Host.Install()
		if installErr != nil {
			return server.Result{}, &server.ToolError{
				Code:    "host_install_failed",
				Message: installErr.Error() + "; have the user run: npx -y @adena-wallet/mcp install-host",
			}
		}

		notes = append(notes, fmt.Sprintf("Installed the agent host for %d browser(s).", len(written)))
		state = stateAdenaUnreachable
	}

	if state == stateAdenaUnreachable || state == stateNoWallet || state == stateHostUntrusted {
		notes = append(notes, setupSteps[state], "Call connect_wallet again once that is done.")

		return server.Result{
			Text:              strings.Join(notes, "\n") + "\n",
			StructuredContent: map[string]any{"state": state, "connected": false, "next_step": setupSteps[state]},
		}, nil
	}

	approvalCtx, cancel := context.WithTimeout(ctx, d.Config.ApprovalTimeout)
	defer cancel()

	var account bridge.Account
	if callErr := d.Bridge.Call(approvalCtx, bridge.MethodConnect, agentParams(ctx), &account); callErr != nil {
		return server.Result{}, bridgeError(callErr)
	}

	if account.ConnectionToken != "" {
		d.Bridge.SetConnectionToken(account.ConnectionToken)
		account.ConnectionToken = ""
	}

	notes = append(notes, fmt.Sprintf("Connected to Adena as %s: account %s on %s.",
		agentName(ctx), account.Address, account.ChainID))

	return server.Result{
		Text: strings.Join(notes, "\n") + "\n",
		StructuredContent: map[string]any{
			"state":      stateReady,
			"connected":  true,
			"agent_name": agentName(ctx),
			"account":    account,
		},
	}, nil
}
