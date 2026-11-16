// Package tools implements the adena MCP tools: get_status, connect_wallet,
// create_session, get_sessions, revoke_session, send_transaction and
// sign_transaction.
package tools

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/gnolang/gno/tm2/pkg/std"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/chain"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/config"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/sessionkey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// Bridge reaches the Adena extension through the agent host.
type Bridge interface {
	Call(ctx context.Context, method string, params, out any) error
}

// Chain signs and broadcasts session transactions and reads session state.
type Chain interface {
	Execute(ctx context.Context, req chain.TxRequest) (chain.TxResult, error)
	SessionAccount(ctx context.Context, rpcURL, master, session string) (*std.BaseSessionAccount, error)
}

// Host installs and inspects the native messaging host.
type Host interface {
	// Installed reports whether any browser has the host registered.
	Installed() bool
	// Install registers the host with the installed browsers and returns the
	// manifests it wrote.
	Install() ([]string, error)
}

// Deps are the collaborators shared by every tool.
type Deps struct {
	Bridge Bridge
	Chain  Chain
	Host   Host
	Keys   *sessionkey.Keyring
	Store  *session.Store
	Now    func() time.Time
	Config config.Config
}

const statusTimeout = 10 * time.Second

var agentNameUnsafe = regexp.MustCompile(`[^a-z0-9-]+`)

// Register adds every tool to r.
func Register(r *server.Registry, d *Deps) {
	if d.Now == nil {
		d.Now = time.Now
	}

	registerGetStatus(r, d)
	registerConnectWallet(r, d)
	registerCreateSession(r, d)
	registerGetSessions(r, d)
	registerRevokeSession(r, d)
	registerSendTransaction(r, d)
	registerSignTransaction(r, d)
}

// agentName identifies this agent to Adena: the MCP client's name, so each
// client (Claude Code, Cursor, ...) is connected and approved separately.
func agentName(ctx context.Context) string {
	name := strings.Trim(agentNameUnsafe.ReplaceAllString(strings.ToLower(server.ClientName(ctx)), "-"), "-")
	if name == "" {
		return config.DefaultAgentName
	}

	return name
}

func agentParams(ctx context.Context) bridge.AgentParams {
	return bridge.AgentParams{AgentName: agentName(ctx)}
}

// bridgeError maps host and extension failures to tool errors the agent can
// act on.
func bridgeError(err error) error {
	var remote *bridge.Error
	if !errors.As(err, &remote) {
		if errors.Is(err, context.DeadlineExceeded) {
			return &server.ToolError{
				Code:    "approval_timeout",
				Message: "the user did not respond in Adena in time; ask them to approve and retry",
			}
		}

		return err
	}

	switch remote.Code {
	case bridge.CodeHostUnavailable:
		return &server.ToolError{
			Code:    "adena_unreachable",
			Message: "Adena is not reachable; call get_status for setup steps",
		}
	case bridge.CodeRejected:
		return &server.ToolError{Code: "user_rejected", Message: "the user rejected the request in Adena"}
	case "wallet_locked":
		return &server.ToolError{Code: "wallet_locked", Message: "Adena is locked; ask the user to unlock it and retry"}
	case "not_connected":
		return &server.ToolError{Code: "not_connected", Message: "this agent is not connected to Adena; call connect_wallet"}
	default:
		return &server.ToolError{Code: remote.Code, Message: remote.Message}
	}
}

// usable reports whether this process can sign with the session now.
func (d *Deps) usable(r *session.Record) bool {
	_, held := d.Keys.Get(r.SessionAddress)

	return held && r.Usable(d.Now())
}

func (d *Deps) publicRecord(r *session.Record) map[string]any {
	_, held := d.Keys.Get(r.SessionAddress)

	return map[string]any{
		"session_address": r.SessionAddress,
		"master_address":  r.MasterAddress,
		"chain_id":        r.ChainID,
		"rpc_url":         r.RPCURL,
		"allow_paths":     r.AllowPaths,
		"spend_limit":     r.SpendLimit,
		"spend_period":    r.SpendPeriod,
		"expires_at":      formatTime(r.ExpiresAt),
		"status":          r.Status,
		"key_held":        held,
		"usable":          held && r.Usable(d.Now()),
		"tx_hash":         r.TxHash,
	}
}

func (d *Deps) publicRecords() ([]map[string]any, error) {
	records, err := d.Store.List()
	if err != nil {
		return nil, err
	}

	out := make([]map[string]any, 0, len(records))
	for i := range records {
		out = append(out, d.publicRecord(&records[i]))
	}

	return out, nil
}

func formatTime(unix int64) string {
	return time.Unix(unix, 0).UTC().Format(time.RFC3339)
}

func objectSchema(props map[string]any, required ...string) map[string]any {
	schema := map[string]any{
		"type":                 "object",
		"properties":           props,
		"additionalProperties": false,
	}

	if len(required) > 0 {
		schema["required"] = required
	}

	return schema
}

func stringProp(description string) map[string]any {
	return map[string]any{"type": "string", "description": description}
}
