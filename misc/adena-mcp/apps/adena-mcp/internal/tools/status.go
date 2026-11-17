package tools

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// Setup states reported by get_status, in the order a user resolves them.
const (
	stateHostNotInstalled = "host_not_installed"
	stateAdenaUnreachable = "adena_unreachable"
	stateNoWallet         = "no_wallet"
	stateLocked           = "locked"
	stateNotConnected     = "not_connected"
	stateReady            = "ready"
)

var setupSteps = map[string]string{
	stateHostNotInstalled: "The Adena agent host is not installed. Call connect_wallet to install it " +
		"automatically, or have the user run: npx -y @adena-wallet/mcp install-host",
	stateAdenaUnreachable: "Adena is not reachable. Ask the user to open the browser with Adena, unlock it, " +
		"and turn on Settings > Security & Privacy > AI Agent Connection (reloading Adena if it asks). " +
		"Adena must be installed from the browser's extension store first.",
	stateNoWallet:     "Adena has no wallet yet. Ask the user to create or import one in Adena.",
	stateLocked:       "Adena is locked. Ask the user to unlock it.",
	stateNotConnected: "This agent is not connected to Adena yet. Call connect_wallet; the user approves it in Adena.",
}

func registerGetStatus(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "get_status",
		Description: "Reports whether the agent can use Adena: host installed, Adena reachable, wallet " +
			"present, unlocked and connected to this agent. When everything is ready it also returns the " +
			"account, network and held sessions; otherwise it returns the next setup step. Call it first.",
		InputSchema: objectSchema(map[string]any{}),
		Annotations: server.Annotations{ReadOnly: true, Idempotent: true},
		Handler: func(ctx context.Context, _ map[string]any) (server.Result, error) {
			return getStatus(ctx, d)
		},
	})
}

// walletState probes the host and the extension and returns the first setup
// state that blocks the agent, along with the extension status when known.
func walletState(ctx context.Context, d *Deps) (string, *bridge.Status, error) {
	callCtx, cancel := context.WithTimeout(ctx, statusTimeout)
	defer cancel()

	var status bridge.Status

	err := d.Bridge.Call(callCtx, bridge.MethodGetStatus, agentParams(ctx), &status)
	if err != nil {
		var remote *bridge.Error
		if !errors.As(err, &remote) || remote.Code != bridge.CodeHostUnavailable {
			return "", nil, bridgeError(err)
		}

		if !d.Host.Installed() {
			return stateHostNotInstalled, nil, nil
		}

		return stateAdenaUnreachable, nil, nil
	}

	// Adena reports the lock state only to a connected agent.
	switch {
	case !status.HasWallet:
		return stateNoWallet, &status, nil
	case !status.Connected:
		return stateNotConnected, &status, nil
	case status.Locked:
		return stateLocked, &status, nil
	default:
		return stateReady, &status, nil
	}
}

func getStatus(ctx context.Context, d *Deps) (server.Result, error) {
	state, status, err := walletState(ctx, d)
	if err != nil {
		return server.Result{}, err
	}

	structured := map[string]any{
		"state":          state,
		"host_installed": state != stateHostNotInstalled,
		"reachable":      status != nil,
		"agent_name":     agentName(ctx),
	}

	if status != nil {
		structured["has_wallet"] = status.HasWallet
		structured["connected"] = status.Connected
		structured["adena_version"] = status.Version

		if status.Connected {
			structured["locked"] = status.Locked
			structured["master_requests_allowed"] = status.MasterRequestsAllowed

			if status.MaxSpendLimit != "" {
				structured["max_spend_limit"] = status.MaxSpendLimit
			}
		}
	}

	if state != stateReady {
		structured["next_step"] = setupSteps[state]

		return server.Result{
			Text:              fmt.Sprintf("State: %s.\n%s\n", state, setupSteps[state]),
			StructuredContent: structured,
		}, nil
	}

	var account bridge.Account
	if callErr := d.Bridge.Call(ctx, bridge.MethodGetAccount, agentParams(ctx), &account); callErr != nil {
		return server.Result{}, bridgeError(callErr)
	}

	sessions, err := d.publicRecords(ctx)
	if err != nil {
		return server.Result{}, err
	}

	structured["account"] = account
	structured["sessions"] = sessions

	var b strings.Builder

	fmt.Fprintf(&b, "State: ready. Account %s on %s (%s).\n", account.Address, account.ChainID, account.RPCURL)

	if status.MasterRequestsAllowed {
		b.WriteString("Master account requests (signer=wallet): allowed.\n")
	} else {
		b.WriteString("Master account requests (signer=wallet): turned off by the user; use sessions.\n")
	}

	if status.MaxSpendLimit != "" {
		fmt.Fprintf(&b, "Largest session spend_limit the user allows: %s.\n", status.MaxSpendLimit)
	}

	fmt.Fprintf(&b, "Sessions held: %d.\n", len(sessions))

	for _, s := range sessions {
		fmt.Fprintf(&b, "- %s usable=%v allow_paths=%v expires %v\n",
			s["session_address"], s["usable"], s["allow_paths"], s["expires_at"])
	}

	return server.Result{Text: b.String(), StructuredContent: structured}, nil
}
