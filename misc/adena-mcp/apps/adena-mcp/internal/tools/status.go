package tools

import (
	"context"
	"fmt"
	"strings"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

func registerStatus(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "adena_status",
		Description: "Reports whether Adena is reachable through the agent host, the user's current " +
			"account and network, and the session keys this server holds. Call it first.",
		InputSchema: objectSchema(map[string]any{}),
		Annotations: server.Annotations{ReadOnly: true, Idempotent: true},
		Handler: func(ctx context.Context, _ map[string]any) (server.Result, error) {
			return statusHandler(ctx, d)
		},
	})
}

func statusHandler(ctx context.Context, d *Deps) (server.Result, error) {
	records, err := d.Store.List()
	if err != nil {
		return server.Result{}, err
	}

	sessions := make([]map[string]any, 0, len(records))
	for i := range records {
		sessions = append(sessions, d.publicRecord(&records[i]))
	}

	structured := map[string]any{"sessions": sessions, "connected": false}

	var b strings.Builder

	callCtx, cancel := context.WithTimeout(ctx, statusTimeout)
	defer cancel()

	var account bridge.Account

	callErr := d.Bridge.Call(callCtx, bridge.MethodGetAccount, nil, &account)
	if callErr != nil {
		structured["adena_error"] = bridgeError(callErr).Error()

		fmt.Fprintf(&b, "Adena: not available (%v).\n", bridgeError(callErr))
	} else {
		structured["connected"] = true
		structured["account"] = account

		fmt.Fprintf(&b, "Adena: connected. Account %s on %s (%s).\n", account.Address, account.ChainID, account.RPCURL)
	}

	fmt.Fprintf(&b, "Session keys held: %d.\n", len(records))

	for i := range records {
		r := &records[i]
		fmt.Fprintf(&b, "- %s for %s on %s, usable=%t, allow_paths=%v, expires %s\n",
			r.SessionAddress, r.MasterAddress, r.ChainID, d.usable(r), r.AllowPaths, sessions[i]["expires_at"])
	}

	return server.Result{Text: b.String(), StructuredContent: structured}, nil
}
