package tools

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/gnolang/gno/gno.land/pkg/sdk/vm"
	"github.com/gnolang/gno/tm2/pkg/crypto"
	"github.com/gnolang/gno/tm2/pkg/sdk/bank"
	"github.com/gnolang/gno/tm2/pkg/std"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/chain"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/sessionkey"
)

var mainPackagePattern = regexp.MustCompile(`(?m)^\s*package\s+main\s*$`)

var commonTxProps = map[string]any{
	"session_address": stringProp("Session to sign with. Default: the newest usable session whose " +
		"allow_paths cover this message."),
	"gas_wanted": map[string]any{
		"type": "integer", "minimum": 1,
		"description": "Gas limit. Default: measured by simulating first.",
	},
	"gas_fee":     stringProp(`Fee such as "10000ugnot". Default: priced from the chain gas price.`),
	"max_deposit": stringProp("Upper bound on the storage deposit, e.g. \"1000000ugnot\"."),
	"simulate": map[string]any{
		"type":        "boolean",
		"description": "Only simulate; nothing is broadcast.",
	},
}

func txProps(extra map[string]any) map[string]any {
	props := make(map[string]any, len(commonTxProps)+len(extra))
	for k, v := range commonTxProps {
		props[k] = v
	}

	for k, v := range extra {
		props[k] = v
	}

	return props
}

func coinsArg(args map[string]any, name string) (std.Coins, error) {
	raw, err := server.StringArg(args, name)
	if err != nil || raw == "" {
		return nil, err
	}

	coins, err := std.ParseCoins(raw)
	if err != nil {
		return nil, server.InvalidArg(name, err.Error())
	}

	return coins, nil
}

func registerCall(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "adena_call",
		Description: "Calls a realm function as the user, signed by a session key. The chain sees the " +
			"user's address as the caller. The session must allow vm/exec for the realm.",
		InputSchema: objectSchema(txProps(map[string]any{
			"pkg_path": stringProp("Realm path, e.g. gno.land/r/demo/counter."),
			"func":     stringProp("Exported crossing function to call."),
			"args": map[string]any{
				"type": "array", "items": map[string]any{"type": "string"},
				"description": "Function arguments as strings, in order.",
			},
			"send": stringProp(`Coins to send with the call, e.g. "1000ugnot".`),
		}), "pkg_path", "func"),
		Annotations: server.Annotations{OpenWorld: true},
		Handler: func(ctx context.Context, args map[string]any) (server.Result, error) {
			pkgPath, err := server.RequiredStringArg(args, "pkg_path")
			if err != nil {
				return server.Result{}, err
			}

			fn, err := server.RequiredStringArg(args, "func")
			if err != nil {
				return server.Result{}, err
			}

			callArgs, err := server.StringSliceArg(args, "args")
			if err != nil {
				return server.Result{}, err
			}

			send, err := coinsArg(args, "send")
			if err != nil {
				return server.Result{}, err
			}

			maxDeposit, err := coinsArg(args, "max_deposit")
			if err != nil {
				return server.Result{}, err
			}

			return writeTx(ctx, d, args, session.RouteExec, pkgPath, "call", func(master crypto.Address) (std.Msg, error) {
				return vm.MsgCall{
					Caller: master, Send: send, MaxDeposit: maxDeposit, PkgPath: pkgPath, Func: fn, Args: callArgs,
				}, nil
			})
		},
	})
}

func registerRun(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "adena_run",
		Description: "Runs a Gno main package as the user, signed by a session key. " +
			"The session must allow vm/run.",
		InputSchema: objectSchema(txProps(map[string]any{
			"code": stringProp("Source of a single-file package main with func main()."),
			"send": stringProp(`Coins to send with the run, e.g. "1000ugnot".`),
		}), "code"),
		Annotations: server.Annotations{OpenWorld: true},
		Handler: func(ctx context.Context, args map[string]any) (server.Result, error) {
			code, err := server.RequiredStringArg(args, "code")
			if err != nil {
				return server.Result{}, err
			}

			if !mainPackagePattern.MatchString(code) {
				return server.Result{}, server.InvalidArg("code", "must declare package main")
			}

			send, err := coinsArg(args, "send")
			if err != nil {
				return server.Result{}, err
			}

			maxDeposit, err := coinsArg(args, "max_deposit")
			if err != nil {
				return server.Result{}, err
			}

			return writeTx(ctx, d, args, session.RouteRun, "", "run", func(master crypto.Address) (std.Msg, error) {
				return vm.MsgRun{
					Caller:     master,
					Send:       send,
					MaxDeposit: maxDeposit,
					// The handler fills in the ephemeral package path.
					Package: &std.MemPackage{
						Name:  "main",
						Files: []*std.MemFile{{Name: "main.gno", Body: code}},
					},
				}, nil
			})
		},
	})
}

func registerSend(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "adena_send",
		Description: "Sends coins from the user's account, signed by a session key. " +
			"The session must allow bank/send.",
		InputSchema: objectSchema(txProps(map[string]any{
			"to":     stringProp("Recipient address."),
			"amount": stringProp(`Coins to send, e.g. "1000000ugnot".`),
		}), "to", "amount"),
		Annotations: server.Annotations{OpenWorld: true},
		Handler: func(ctx context.Context, args map[string]any) (server.Result, error) {
			to, err := server.RequiredStringArg(args, "to")
			if err != nil {
				return server.Result{}, err
			}

			recipient, err := crypto.AddressFromBech32(to)
			if err != nil {
				return server.Result{}, server.InvalidArg("to", err.Error())
			}

			amount, err := coinsArg(args, "amount")
			if err != nil {
				return server.Result{}, err
			}

			if amount.Empty() {
				return server.Result{}, server.InvalidArg("amount", "required")
			}

			return writeTx(ctx, d, args, session.RouteSend, "", "send", func(master crypto.Address) (std.Msg, error) {
				return bank.MsgSend{FromAddress: master, ToAddress: recipient, Amount: amount}, nil
			})
		},
	})
}

func writeTx(
	ctx context.Context,
	d *Deps,
	args map[string]any,
	route, pkgPath, kind string,
	msg func(master crypto.Address) (std.Msg, error),
) (server.Result, error) {
	record, key, err := selectSession(d, args, route, pkgPath)
	if err != nil {
		return server.Result{}, err
	}

	gasWanted, err := server.IntArg(args, "gas_wanted", 0)
	if err != nil {
		return server.Result{}, err
	}

	if gasWanted < 0 {
		return server.Result{}, server.InvalidArg("gas_wanted", "must be positive")
	}

	gasFee, err := server.StringArg(args, "gas_fee")
	if err != nil {
		return server.Result{}, err
	}

	simulateOnly, err := server.BoolArg(args, "simulate", false)
	if err != nil {
		return server.Result{}, err
	}

	result, err := d.Chain.Execute(ctx, chain.TxRequest{
		Signer:     key,
		Msg:        msg,
		RPCURL:     record.RPCURL,
		ChainID:    record.ChainID,
		Master:     record.MasterAddress,
		GasFee:     gasFee,
		GasWanted:  gasWanted,
		GasCeiling: d.Config.GasCeiling,
		Simulate:   simulateOnly,
	})
	if err != nil {
		return server.Result{}, txError(err)
	}

	verb := "Broadcast"
	if simulateOnly {
		verb = "Simulated"
	}

	var b strings.Builder

	fmt.Fprintf(&b, "%s %s. Signed by session %s on behalf of %s.\n",
		verb, kind, record.SessionAddress, record.MasterAddress)
	fmt.Fprintf(&b, "Gas wanted %d, used %d, fee %s.\n", result.GasWanted, result.GasUsed, result.GasFee)

	if result.TxHash != "" {
		fmt.Fprintf(&b, "Tx hash %s at height %d.\n", result.TxHash, result.Height)
	}

	if result.Data != "" {
		fmt.Fprintf(&b, "Result: %s\n", strings.TrimSpace(result.Data))
	}

	return server.Result{
		Text: b.String(),
		StructuredContent: map[string]any{
			"simulated":       result.Simulated,
			"tx_hash":         result.TxHash,
			"height":          result.Height,
			"gas_wanted":      result.GasWanted,
			"gas_used":        result.GasUsed,
			"gas_fee":         result.GasFee,
			"result":          result.Data,
			"session_address": record.SessionAddress,
			"master_address":  record.MasterAddress,
		},
	}, nil
}

func selectSession(d *Deps, args map[string]any, route, pkgPath string) (session.Record, *sessionkey.Key, error) {
	address, err := server.StringArg(args, "session_address")
	if err != nil {
		return session.Record{}, nil, err
	}

	if address != "" {
		return pickSession(d, address, route, pkgPath)
	}

	records, err := d.Store.List()
	if err != nil {
		return session.Record{}, nil, err
	}

	for i := range records {
		if !d.usable(&records[i]) || !records[i].Allows(route, pkgPath) {
			continue
		}

		if key, ok := d.Keys.Get(records[i].SessionAddress); ok {
			return records[i], key, nil
		}
	}

	return session.Record{}, nil, scopeError(route, pkgPath)
}

func pickSession(d *Deps, address, route, pkgPath string) (session.Record, *sessionkey.Key, error) {
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
				"with adena_session_revoke and create a new one",
		}
	}

	if !record.Usable(d.Now()) {
		return session.Record{}, nil, &server.ToolError{
			Code:    "session_expired",
			Message: "session " + address + " is revoked or expired; create a new one with adena_session_create",
		}
	}

	if !record.Allows(route, pkgPath) {
		return session.Record{}, nil, scopeError(route, pkgPath)
	}

	return record, key, nil
}

func scopeError(route, pkgPath string) *server.ToolError {
	needed := route
	if route == session.RouteExec && pkgPath != "" {
		needed = route + ":" + pkgPath
	}

	return &server.ToolError{
		Code:    "session_required",
		Message: fmt.Sprintf("no usable session allows %s; call adena_session_create with allow_paths [%q]", needed, needed),
		Extra:   map[string]any{"required_allow_path": needed},
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
				Message: "the chain refused the session for this message: " + txErr.Error(),
			}
		}

		return &server.ToolError{Code: "transaction_failed", Message: txErr.Error()}
	}

	return err
}
