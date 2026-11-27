// Package tools implements the adena MCP tools: get_status, connect_wallet,
// create_session, get_sessions, revoke_session, send_transaction and
// sign_transaction.
package tools

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/chain"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/config"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/hardening"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/sessionkey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// Bridge reaches the Adena extension through the agent host.
type Bridge interface {
	Call(ctx context.Context, method string, params, out any) error
	// SetConnectionToken keeps the token connect returned for later requests.
	SetConnectionToken(token string)
}

// Chain signs and broadcasts session transactions and reads session state.
type Chain interface {
	Execute(ctx context.Context, req chain.TxRequest) (chain.TxResult, error)
	SessionAccount(ctx context.Context, rpcURL, master, session string) (*chain.Session, error)
}

// Host installs and inspects the native messaging host.
type Host interface {
	// Installed reports whether any browser has the host registered.
	Installed() bool
	// Install registers the host with the installed browsers and returns the
	// manifests it wrote.
	Install() ([]string, error)
	// Hints explain setup problems found on this machine, such as an Adena
	// build that is not allowed to start the host.
	Hints() []string
}

// Deps are the collaborators shared by every tool.
type Deps struct {
	Bridge Bridge
	Chain  Chain
	Host   Host
	Keys   *sessionkey.Keyring
	Store  *session.Store
	Now    func() time.Time
	// Protection is the process hardening report; create_session needs it full.
	Protection hardening.Report
	Config     config.Config
	// VerifyRetryDelay spaces the on-chain lookups of a new session; zero
	// means one second.
	VerifyRetryDelay time.Duration
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
			return approvalTimeoutError()
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
	case "approval_timeout":
		return approvalTimeoutError()
	case bridge.CodeExtensionGone:
		return &server.ToolError{
			Code: bridge.CodeExtensionGone,
			Message: "the connection to Adena closed while the request was open, so its outcome is unknown: " +
				"an approval may already have been signed or broadcast. Before asking again, check " +
				"get_sessions with refresh=true for a session, or the account's recent transactions",
		}
	case "context_mismatch":
		return &server.ToolError{
			Code: "context_mismatch",
			Message: remote.Message + ". The session belongs to that account and chain; nothing was " +
				"sent. Retry once the user has switched",
		}
	case "approval_pending":
		return &server.ToolError{
			Code: "approval_pending",
			Message: "another approval is open in Adena; wait for the user to finish it, then retry. " +
				"Send requests that need approval one at a time",
		}
	case "wallet_locked":
		return &server.ToolError{Code: "wallet_locked", Message: "Adena is locked; ask the user to unlock it and retry"}
	case "not_connected":
		return &server.ToolError{
			Code: "not_connected",
			Message: "this agent is not connected to Adena; call connect_wallet. Each adena-mcp process, " +
				"including one restarted, needs the user's approval",
		}
	case "master_requests_disabled":
		return &server.ToolError{
			Code: "master_requests_disabled",
			Message: "the user has not allowed master account requests; sign with a session (create_session), " +
				"or ask the user to turn on Settings > Security & Privacy > AI Agent Connection > " +
				"Allow master account requests in Adena",
		}
	default:
		return &server.ToolError{Code: remote.Code, Message: remote.Message}
	}
}

// approvalTimeoutError does not suggest a blind retry: the user may have
// approved just as the request was cancelled.
func approvalTimeoutError() *server.ToolError {
	return &server.ToolError{
		Code: "approval_timeout",
		Message: "the user did not respond in Adena in time and the request was cancelled. Before " +
			"asking again, check that it did not go through: get_sessions with refresh=true for a " +
			"session, or the account's recent transactions for a transaction",
	}
}

// agentRecords lists the sessions this agent created.
func (d *Deps) agentRecords(ctx context.Context) ([]session.Record, error) {
	records, err := d.Store.List()
	if err != nil {
		return nil, err
	}

	agent := agentName(ctx)

	return slices.DeleteFunc(records, func(r session.Record) bool { return !r.OwnedBy(agent) }), nil
}

// agentRecord returns one of this agent's sessions.
func (d *Deps) agentRecord(ctx context.Context, address string) (session.Record, error) {
	record, err := d.Store.Get(address)
	if err != nil {
		return session.Record{}, err
	}

	if !record.OwnedBy(agentName(ctx)) {
		return session.Record{}, fmt.Errorf("%w: %s", session.ErrNotFound, address)
	}

	return record, nil
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

func (d *Deps) publicRecords(ctx context.Context) ([]map[string]any, error) {
	records, err := d.agentRecords(ctx)
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
