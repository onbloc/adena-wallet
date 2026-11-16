// Package bridge defines the request protocol shared by the MCP server, the
// agent host and the Adena extension, and a client for the host socket.
//
// On the socket every message is one line of JSON. The host forwards requests
// to the extension unchanged except for the id, which it rewrites to route the
// response back to the right connection.
package bridge

import (
	"encoding/json"
	"fmt"
)

// MaxLineSize bounds one JSON line on the host socket.
const MaxLineSize = 1 << 20

// Methods understood by the Adena extension.
const (
	MethodPing          = "ping"
	MethodGetAccount    = "get_account"
	MethodCreateSession = "create_session"
	MethodRevokeSession = "revoke_session"
)

// Error codes produced by the host itself; the extension reports its own.
const (
	CodeHostUnavailable = "host_unavailable"
	CodeExtensionGone   = "extension_disconnected"
	CodeRejected        = "rejected"
)

// Request is a call from an agent to the extension.
type Request struct {
	ID     string          `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params,omitempty"`
}

// Response carries either a result or an error for a request id.
type Response struct {
	Error  *Error          `json:"error,omitempty"`
	ID     string          `json:"id"`
	Result json.RawMessage `json:"result,omitempty"`
}

// Error is a failure reported by the host or the extension.
type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *Error) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Account is the extension's current master account and network.
type Account struct {
	Address string `json:"address"`
	ChainID string `json:"chain_id"`
	RPCURL  string `json:"rpc_url"`
}

// CreateSessionParams asks the user to authorize a session key.
type CreateSessionParams struct {
	SessionPublicKey string   `json:"session_public_key"`
	SpendLimit       string   `json:"spend_limit"`
	AgentName        string   `json:"agent_name,omitempty"`
	AllowPaths       []string `json:"allow_paths"`
	SpendPeriod      int64    `json:"spend_period,omitempty"`
	ExpiresAt        int64    `json:"expires_at"`
}

// RevokeSessionParams asks the user to revoke a session key.
type RevokeSessionParams struct {
	SessionPublicKey string `json:"session_public_key"`
	AgentName        string `json:"agent_name,omitempty"`
}

// SessionTxResult describes the session admin transaction the user signed.
type SessionTxResult struct {
	TxHash        string          `json:"tx_hash"`
	MasterAddress string          `json:"master_address"`
	ChainID       string          `json:"chain_id"`
	Height        json.RawMessage `json:"height,omitempty"`
	ExpiresAt     int64           `json:"expires_at,omitempty"`
}
