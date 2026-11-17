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
	"strconv"
	"strings"
)

// MaxLineSize bounds one JSON line on the host socket.
const MaxLineSize = 1 << 20

// Methods understood by the Adena extension.
const (
	MethodPing            = "ping"
	MethodGetStatus       = "get_status"
	MethodConnect         = "connect"
	MethodGetAccount      = "get_account"
	MethodCreateSession   = "create_session"
	MethodRevokeSession   = "revoke_session"
	MethodSendTransaction = "send_transaction"
	MethodSignTransaction = "sign_transaction"
	// MethodCancel is sent by the host only, when the agent that made a request
	// goes away, so Adena closes the request's approval popup.
	MethodCancel = "cancel"
)

// Error codes produced by the host itself; the extension reports its own.
const (
	CodeHostUnavailable = "host_unavailable"
	CodeExtensionGone   = "extension_disconnected"
	CodeRejected        = "rejected"
	// CodeRequestTooLarge means a request line exceeded MaxLineSize.
	CodeRequestTooLarge = "request_too_large"
)

// Peer is the process connected to the host socket, as the operating system
// reports it. The host sets it on every request; clients cannot.
type Peer struct {
	Exe string `json:"exe,omitempty"`
	PID int    `json:"pid,omitempty"`
}

// Request is a call from an agent to the extension.
type Request struct {
	Peer *Peer `json:"peer,omitempty"`
	// Token is the connection token Adena issued to this process on connect.
	Token  string          `json:"token,omitempty"`
	ID     string          `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params,omitempty"`
}

// CancelParams names the request a cancel is for.
type CancelParams struct {
	RequestID string `json:"request_id"`
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

// AgentParams identifies the agent; every request carries it so Adena can
// check that the agent is connected.
type AgentParams struct {
	AgentName string `json:"agent_name,omitempty"`
}

// Status is the wallet state reported without revealing the address. Only a
// connected agent learns more than whether a wallet exists.
type Status struct {
	ChainID *string `json:"chain_id"`
	RPCURL  *string `json:"rpc_url"`
	Version string  `json:"version"`
	// MaxSpendLimit is the largest session spend limit the user allows, e.g.
	// "10000000ugnot".
	MaxSpendLimit string `json:"max_spend_limit,omitempty"`
	HasWallet     bool   `json:"has_wallet"`
	Locked        bool   `json:"locked"`
	Connected     bool   `json:"connected"`
	// MasterRequestsAllowed is the user's setting for signer=wallet requests.
	MasterRequestsAllowed bool `json:"master_requests_allowed"`
}

// TransactionParams asks the user to sign messages with the master account.
type TransactionParams struct {
	AgentName string            `json:"agent_name,omitempty"`
	Memo      string            `json:"memo,omitempty"`
	Messages  []json.RawMessage `json:"messages"`
	GasWanted int64             `json:"gas_wanted,omitempty"`
	GasFee    int64             `json:"gas_fee,omitempty"`
}

// BroadcastResult is a transaction the user signed and Adena broadcast.
type BroadcastResult struct {
	TxHash        string          `json:"tx_hash"`
	MasterAddress string          `json:"master_address"`
	ChainID       string          `json:"chain_id"`
	Height        json.RawMessage `json:"height,omitempty"`
}

// SignResult is a transaction the user signed without broadcasting.
type SignResult struct {
	SignedTx      string `json:"signed_tx"`
	SignerAddress string `json:"signer_address"`
	ChainID       string `json:"chain_id"`
}

// Account is the extension's current master account and network.
type Account struct {
	Address string `json:"address"`
	ChainID string `json:"chain_id"`
	RPCURL  string `json:"rpc_url"`
	// ConnectionToken is set by connect only. It authenticates this process to
	// Adena and must not be shown to the agent.
	ConnectionToken string `json:"connection_token,omitempty"`
}

// CreateSessionParams asks the user to authorize a session key. Adena refuses
// it unless its current account and chain match MasterAddress and ChainID.
type CreateSessionParams struct {
	SessionPublicKey string   `json:"session_public_key"`
	SpendLimit       string   `json:"spend_limit"`
	AgentName        string   `json:"agent_name,omitempty"`
	MasterAddress    string   `json:"master_address,omitempty"`
	ChainID          string   `json:"chain_id,omitempty"`
	AllowPaths       []string `json:"allow_paths"`
	SpendPeriod      int64    `json:"spend_period,omitempty"`
	ExpiresAt        int64    `json:"expires_at"`
}

// RevokeSessionParams asks the user to revoke a session key on the account and
// chain that created it.
type RevokeSessionParams struct {
	SessionPublicKey string `json:"session_public_key"`
	AgentName        string `json:"agent_name,omitempty"`
	MasterAddress    string `json:"master_address,omitempty"`
	ChainID          string `json:"chain_id,omitempty"`
}

// SessionTxResult describes the session admin transaction the user signed:
// the account and network it ran on, and the block that committed it.
type SessionTxResult struct {
	TxHash        string          `json:"tx_hash"`
	MasterAddress string          `json:"master_address"`
	ChainID       string          `json:"chain_id"`
	RPCURL        string          `json:"rpc_url,omitempty"`
	Height        json.RawMessage `json:"height,omitempty"`
	ExpiresAt     int64           `json:"expires_at,omitempty"`
}

// CommittedHeight returns the block height the transaction was committed at,
// or 0 when Adena reported none, e.g. for a broadcast that only passed
// CheckTx.
func (r *SessionTxResult) CommittedHeight() int64 {
	raw := strings.Trim(strings.TrimSpace(string(r.Height)), `"`)

	height, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || height <= 0 {
		return 0
	}

	return height
}
