package tools

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/gnolang/gno/tm2/pkg/crypto"
	"github.com/gnolang/gno/tm2/pkg/std"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/chain"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/sessionkey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// Signers for send_transaction and sign_transaction.
const (
	signerSession = "session"
	signerWallet  = "wallet"
)

const messagesDescription = "Messages in Adena's format, signed together in one transaction. " +
	"Signer fields (caller, creator, from_address) may be omitted; they are set to the wallet address.\n" +
	`- {"type":"/vm.m_call","value":{"pkg_path":"gno.land/r/...","func":"F","args":["1"],"send":"","max_deposit":""}}` +
	"\n" +
	`- {"type":"/vm.m_run","value":{"send":"","package":{"name":"main","path":"",` +
	`"files":[{"name":"main.gno","body":"package main\n\nfunc main() {}"}]}}}` + "\n" +
	`- {"type":"/vm.m_addpkg","value":{"package":{"name":"foo","path":"gno.land/p/<ns>/foo",` +
	`"files":[{"name":"foo.gno","body":"..."}]},"send":"","max_deposit":""}} (signer=wallet only)` + "\n" +
	`- {"type":"/bank.MsgSend","value":{"to_address":"g1...","amount":"1000ugnot"}}`

func txSchema(extra map[string]any) map[string]any {
	props := map[string]any{
		"messages": map[string]any{
			"type":        "array",
			"minItems":    1,
			"description": messagesDescription,
			"items": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"type": map[string]any{
						"type": "string",
						"enum": []string{msgCall, msgRun, msgAddPkg, msgSend},
					},
					"value": map[string]any{"type": "object"},
				},
				"required": []string{"type", "value"},
			},
		},
		"memo": stringProp("Transaction memo."),
		"signer": map[string]any{
			"type": "string",
			"enum": []string{signerSession, signerWallet},
			"description": `"session" (default) signs without a popup using a session from create_session whose ` +
				`allow_paths cover every message. "wallet" asks the user to approve and sign in Adena with ` +
				`the master account; required for /vm.m_addpkg. "wallet" works only if the user turned on ` +
				`"Allow master account requests" in Adena (get_status reports master_requests_allowed).`,
		},
		"session_address": stringProp("Session to sign with (signer=session). Default: the newest usable " +
			"session that covers every message."),
		"gas_wanted": map[string]any{
			"type": "integer", "minimum": 1,
			"description": "Gas limit. Default: measured by simulation (session) or set in Adena (wallet).",
		},
		"gas_fee": stringProp(`Fee in ugnot, e.g. "10000ugnot". Default: priced from the chain gas price.`),
	}

	for k, v := range extra {
		props[k] = v
	}

	return objectSchema(props, "messages")
}

func registerSendTransaction(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "send_transaction",
		Description: "Signs and broadcasts a transaction of one or more messages (/vm.m_call, /vm.m_run, " +
			"/vm.m_addpkg, /bank.MsgSend) as the user. By default it signs with a session key without a popup; " +
			`with signer="wallet" the user approves and signs it in Adena.`,
		InputSchema: txSchema(map[string]any{
			"simulate": map[string]any{
				"type":        "boolean",
				"description": "Only simulate with the session key; nothing is broadcast (signer=session).",
			},
		}),
		Annotations: server.Annotations{OpenWorld: true},
		Handler: func(ctx context.Context, args map[string]any) (server.Result, error) {
			return transact(ctx, d, args, false)
		},
	})
}

func registerSignTransaction(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "sign_transaction",
		Description: "Signs a transaction of one or more messages as the user without broadcasting it and " +
			"returns the signed transaction (base64 amino). By default it signs with a session key; with " +
			`signer="wallet" the user approves and signs it in Adena.`,
		InputSchema: txSchema(nil),
		Annotations: server.Annotations{OpenWorld: true},
		Handler: func(ctx context.Context, args map[string]any) (server.Result, error) {
			return transact(ctx, d, args, true)
		},
	})
}

type txArgs struct {
	signer         string
	sessionAddress string
	memo           string
	gasFee         string
	messages       []txMessage
	gasWanted      int64
	simulate       bool
}

func parseTxArgs(args map[string]any) (txArgs, error) {
	messages, err := parseMessages(args["messages"])
	if err != nil {
		return txArgs{}, err
	}

	in := txArgs{messages: messages}

	if in.signer, err = server.StringArg(args, "signer"); err != nil {
		return txArgs{}, err
	}

	if in.signer == "" {
		in.signer = signerSession
	}

	if in.signer != signerSession && in.signer != signerWallet {
		return txArgs{}, server.InvalidArg("signer", `must be "session" or "wallet"`)
	}

	if in.sessionAddress, err = server.StringArg(args, "session_address"); err != nil {
		return txArgs{}, err
	}

	if in.memo, err = server.StringArg(args, "memo"); err != nil {
		return txArgs{}, err
	}

	if in.gasFee, err = server.StringArg(args, "gas_fee"); err != nil {
		return txArgs{}, err
	}

	if in.gasWanted, err = server.IntArg(args, "gas_wanted", 0); err != nil {
		return txArgs{}, err
	}

	if in.gasWanted < 0 {
		return txArgs{}, server.InvalidArg("gas_wanted", "must be positive")
	}

	if in.simulate, err = server.BoolArg(args, "simulate", false); err != nil {
		return txArgs{}, err
	}

	return in, nil
}

func transact(ctx context.Context, d *Deps, args map[string]any, signOnly bool) (server.Result, error) {
	in, err := parseTxArgs(args)
	if err != nil {
		return server.Result{}, err
	}

	if in.signer == signerWallet {
		if in.simulate {
			return server.Result{}, server.InvalidArg("simulate", "only works with signer=session")
		}

		return walletTransact(ctx, d, in, signOnly)
	}

	return sessionTransact(ctx, d, in, signOnly)
}

func walletTransact(ctx context.Context, d *Deps, in txArgs, signOnly bool) (server.Result, error) {
	params := bridge.TransactionParams{AgentName: agentName(ctx), Memo: in.memo, GasWanted: in.gasWanted}

	if in.gasFee != "" {
		fee, err := std.ParseCoin(in.gasFee)
		if err != nil || fee.Denom != "ugnot" {
			return server.Result{}, server.InvalidArg("gas_fee", `must be an amount of ugnot such as "10000ugnot"`)
		}

		params.GasFee = fee.Amount
	}

	for _, m := range in.messages {
		params.Messages = append(params.Messages, m.raw)
	}

	approvalCtx, cancel := context.WithTimeout(ctx, d.Config.ApprovalTimeout)
	defer cancel()

	if signOnly {
		var signed bridge.SignResult
		if err := d.Bridge.Call(approvalCtx, bridge.MethodSignTransaction, params, &signed); err != nil {
			return server.Result{}, bridgeError(err)
		}

		return server.Result{
			Text: fmt.Sprintf("Signed by %s in Adena on %s. Not broadcast.\n", signed.SignerAddress, signed.ChainID),
			StructuredContent: map[string]any{
				"signer":         signerWallet,
				"signed_tx":      signed.SignedTx,
				"signer_address": signed.SignerAddress,
				"chain_id":       signed.ChainID,
			},
		}, nil
	}

	var sent bridge.BroadcastResult
	if err := d.Bridge.Call(approvalCtx, bridge.MethodSendTransaction, params, &sent); err != nil {
		return server.Result{}, bridgeError(err)
	}

	return server.Result{
		Text: fmt.Sprintf("Signed by %s in Adena and broadcast on %s. Tx hash %s.\n",
			sent.MasterAddress, sent.ChainID, sent.TxHash),
		StructuredContent: map[string]any{
			"signer":         signerWallet,
			"tx_hash":        sent.TxHash,
			"height":         sent.Height,
			"master_address": sent.MasterAddress,
			"chain_id":       sent.ChainID,
		},
	}, nil
}

func sessionTransact(ctx context.Context, d *Deps, in txArgs, signOnly bool) (server.Result, error) {
	for _, m := range in.messages {
		if m.route == "" {
			return server.Result{}, &server.ToolError{
				Code:    "wallet_signature_required",
				Message: m.typ + ` cannot be signed by a session; call again with signer="wallet"`,
			}
		}
	}

	record, key, err := selectSession(d, in.sessionAddress, in.messages)
	if err != nil {
		return server.Result{}, err
	}

	mode := chain.Broadcast

	switch {
	case signOnly:
		mode = chain.SignOnly
	case in.simulate:
		mode = chain.Simulate
	}

	result, err := d.Chain.Execute(ctx, chain.TxRequest{
		Signer: key,
		Msgs: func(master crypto.Address) ([]std.Msg, error) {
			return buildSessionMsgs(in.messages, master)
		},
		RPCURL:     record.RPCURL,
		ChainID:    record.ChainID,
		Master:     record.MasterAddress,
		Memo:       in.memo,
		GasFee:     in.gasFee,
		GasWanted:  in.gasWanted,
		GasCeiling: d.Config.GasCeiling,
		Mode:       mode,
	})
	if err != nil {
		return server.Result{}, txError(err)
	}

	return sessionResult(&record, result, mode, len(in.messages)), nil
}

func sessionResult(record *session.Record, result chain.TxResult, mode chain.Mode, count int) server.Result {
	structured := map[string]any{
		"signer":          signerSession,
		"session_address": record.SessionAddress,
		"master_address":  record.MasterAddress,
		"chain_id":        record.ChainID,
		"gas_wanted":      result.GasWanted,
		"gas_fee":         result.GasFee,
	}

	var b strings.Builder

	switch mode {
	case chain.SignOnly:
		structured["signed_tx"] = base64.StdEncoding.EncodeToString(result.SignedTx)

		fmt.Fprintf(&b, "Signed %d message(s) with session %s on behalf of %s. Not broadcast.\n",
			count, record.SessionAddress, record.MasterAddress)
	case chain.Simulate:
		structured["simulated"] = true
		structured["gas_used"] = result.GasUsed
		structured["result"] = result.Data

		fmt.Fprintf(&b, "Simulated %d message(s) with session %s. Gas used %d.\n",
			count, record.SessionAddress, result.GasUsed)
	default:
		structured["tx_hash"] = result.TxHash
		structured["height"] = result.Height
		structured["gas_used"] = result.GasUsed
		structured["result"] = result.Data

		fmt.Fprintf(&b, "Broadcast %d message(s). Signed by session %s on behalf of %s.\n",
			count, record.SessionAddress, record.MasterAddress)
		fmt.Fprintf(&b, "Tx hash %s at height %d.\n", result.TxHash, result.Height)
	}

	fmt.Fprintf(&b, "Gas wanted %d, fee %s.\n", result.GasWanted, result.GasFee)

	if result.Data != "" {
		fmt.Fprintf(&b, "Result: %s\n", strings.TrimSpace(result.Data))
	}

	return server.Result{Text: b.String(), StructuredContent: structured}
}

// selectSession picks the session to sign with: the one named, or the newest
// usable session whose allow_paths cover every message.
func selectSession(d *Deps, address string, messages []txMessage) (session.Record, *sessionkey.Key, error) {
	covers := func(r *session.Record) bool {
		for _, m := range messages {
			if !r.Allows(m.route, m.pkgPath) {
				return false
			}
		}

		return true
	}

	if address != "" {
		return pickSession(d, address, covers, messages)
	}

	records, err := d.Store.List()
	if err != nil {
		return session.Record{}, nil, err
	}

	for i := range records {
		if !d.usable(&records[i]) || !covers(&records[i]) {
			continue
		}

		if key, ok := d.Keys.Get(records[i].SessionAddress); ok {
			return records[i], key, nil
		}
	}

	return session.Record{}, nil, scopeError(messages)
}

func pickSession(
	d *Deps,
	address string,
	covers func(*session.Record) bool,
	messages []txMessage,
) (session.Record, *sessionkey.Key, error) {
	record, err := d.Store.Get(address)
	if err != nil {
		return session.Record{}, nil, &server.ToolError{
			Code:    "session_unknown",
			Message: "this server holds no session " + address,
		}
	}

	key, held := d.Keys.Get(address)
	if !held {
		return session.Record{}, nil, &server.ToolError{
			Code: "session_key_lost",
			Message: "the key for session " + address + " was lost when the server restarted; revoke it " +
				"with revoke_session and create a new one",
		}
	}

	if !record.Usable(d.Now()) {
		return session.Record{}, nil, &server.ToolError{
			Code:    "session_expired",
			Message: "session " + address + " is revoked or expired; create a new one with create_session",
		}
	}

	if !covers(&record) {
		return session.Record{}, nil, scopeError(messages)
	}

	return record, key, nil
}

func scopeError(messages []txMessage) *server.ToolError {
	needed := make([]string, 0, len(messages))

	for _, m := range messages {
		entry := m.route
		if m.route == session.RouteExec {
			entry += ":" + m.pkgPath
		}

		if !slices.Contains(needed, entry) {
			needed = append(needed, entry)
		}
	}

	quoted, err := json.Marshal(needed)
	if err != nil {
		quoted = []byte(strings.Join(needed, ","))
	}

	return &server.ToolError{
		Code: "session_required",
		Message: fmt.Sprintf("no usable session covers these messages; call create_session with allow_paths %s, "+
			`or call again with signer="wallet" to have the user sign in Adena`, quoted),
		Extra: map[string]any{"required_allow_paths": needed},
	}
}

func txError(err error) error {
	var spendErr *chain.SpendError
	if errors.As(err, &spendErr) {
		return &server.ToolError{
			Code:    "session_spend_limit",
			Message: spendErr.Error() + "; create a session with a larger spend_limit",
		}
	}

	if errors.Is(err, chain.ErrSessionNotFound) {
		return &server.ToolError{
			Code:    "session_expired",
			Message: "the chain no longer holds this session (revoked or expired); create a new one",
		}
	}

	var txErr *chain.TxError
	if errors.As(err, &txErr) {
		lower := strings.ToLower(txErr.Error())
		if strings.Contains(lower, "session not allowed") || strings.Contains(lower, "not allowed by session") {
			return &server.ToolError{
				Code:    "session_scope",
				Message: "the chain refused the session for this transaction: " + txErr.Error(),
			}
		}

		return &server.ToolError{Code: "transaction_failed", Message: txErr.Error()}
	}

	var invalid *messageError
	if errors.As(err, &invalid) {
		return server.InvalidArg("messages", invalid.Error())
	}

	return err
}
