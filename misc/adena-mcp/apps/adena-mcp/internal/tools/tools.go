// Package tools implements the adena_* MCP tools.
package tools

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/config"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/gnokey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// Bridge reaches the Adena extension through the agent host.
type Bridge interface {
	Call(ctx context.Context, method string, params, out any) error
}

// Gnokey is the subset of the gnokey CLI the tools use.
type Gnokey interface {
	AddKey(ctx context.Context, name, password string) (gnokey.Key, error)
	DeleteKey(ctx context.Context, name string) error
	MakeTx(ctx context.Context, opts gnokey.TxOptions) (gnokey.TxResult, error)
	Query(ctx context.Context, remote, path string) (string, error)
}

// Deps are the collaborators shared by every tool.
type Deps struct {
	Bridge Bridge
	Gnokey Gnokey
	Store  *session.Store
	Now    func() time.Time
	Config config.Config
}

const statusTimeout = 10 * time.Second

// Register adds every adena_* tool to r.
func Register(r *server.Registry, d *Deps) {
	if d.Now == nil {
		d.Now = time.Now
	}

	registerStatus(r, d)
	registerSessionCreate(r, d)
	registerSessionList(r, d)
	registerSessionRevoke(r, d)
	registerCall(r, d)
	registerRun(r, d)
	registerSend(r, d)
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
	case bridge.CodeRejected:
		return &server.ToolError{Code: "user_rejected", Message: "the user rejected the request in Adena"}
	case "wallet_locked":
		return &server.ToolError{Code: "wallet_locked", Message: "Adena is locked; ask the user to unlock it and retry"}
	default:
		return &server.ToolError{Code: remote.Code, Message: remote.Message}
	}
}

func randomHex(n int) (string, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}

	return hex.EncodeToString(buf), nil
}

func publicRecord(r *session.Record, now time.Time) map[string]any {
	return map[string]any{
		"session_address": r.SessionAddress,
		"master_address":  r.MasterAddress,
		"chain_id":        r.ChainID,
		"rpc_url":         r.RPCURL,
		"allow_paths":     r.AllowPaths,
		"spend_limit":     r.SpendLimit,
		"spend_period":    r.SpendPeriod,
		"expires_at":      time.Unix(r.ExpiresAt, 0).UTC().Format(time.RFC3339),
		"status":          r.Status,
		"usable":          r.Usable(now),
		"tx_hash":         r.TxHash,
	}
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
