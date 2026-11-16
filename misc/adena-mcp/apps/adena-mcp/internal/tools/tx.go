package tools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/gnokey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
)

// Gas sizing follows gno-mcp: measure at a ceiling, reserve 1.5x what was used,
// and price the fee for the gas reserved, because the chain charges the whole
// offered fee against the session spend limit.
const (
	minGasWanted = 100_000
	// The genesis floor is 1ugnot per 1000 gas.
	floorPriceAmount = 1
	floorPriceGas    = 1000
)

var gasPricePattern = regexp.MustCompile(`^(\d+)ugnot$`)

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

func registerCall(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "adena_call",
		Description: "Calls a realm function as the user, signed by a session key (gnokey maketx call " +
			"--master). The session must allow vm/exec for the realm.",
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

			send, err := server.StringArg(args, "send")
			if err != nil {
				return server.Result{}, err
			}

			return writeTx(ctx, d, args, session.RouteExec, pkgPath, gnokey.TxOptions{
				Kind:    gnokey.TxCall,
				PkgPath: pkgPath,
				Func:    fn,
				Args:    callArgs,
				Send:    send,
			})
		},
	})
}

func registerRun(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "adena_run",
		Description: "Runs a Gno main package as the user, signed by a session key (gnokey maketx run " +
			"--master). The session must allow vm/run.",
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

			send, err := server.StringArg(args, "send")
			if err != nil {
				return server.Result{}, err
			}

			dir, err := os.MkdirTemp("", "adena-mcp-run-")
			if err != nil {
				return server.Result{}, fmt.Errorf("create run directory: %w", err)
			}

			defer func() { _ = os.RemoveAll(dir) }()

			file := filepath.Join(dir, "main.gno")
			if err := os.WriteFile(file, []byte(code), 0o600); err != nil {
				return server.Result{}, fmt.Errorf("write run file: %w", err)
			}

			return writeTx(ctx, d, args, session.RouteRun, "", gnokey.TxOptions{
				Kind: gnokey.TxRun,
				File: file,
				Send: send,
			})
		},
	})
}

func registerSend(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "adena_send",
		Description: "Sends coins from the user's account, signed by a session key (gnokey maketx send " +
			"--master). The session must allow bank/send.",
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

			amount, err := server.RequiredStringArg(args, "amount")
			if err != nil {
				return server.Result{}, err
			}

			return writeTx(ctx, d, args, session.RouteSend, "", gnokey.TxOptions{
				Kind: gnokey.TxSend,
				To:   to,
				Send: amount,
			})
		},
	})
}

func writeTx(
	ctx context.Context,
	d *Deps,
	args map[string]any,
	route, pkgPath string,
	opts gnokey.TxOptions,
) (server.Result, error) {
	record, err := selectSession(d, args, route, pkgPath)
	if err != nil {
		return server.Result{}, err
	}

	if argErr := applyCommonTxArgs(args, &opts); argErr != nil {
		return server.Result{}, argErr
	}

	simulateOnly, err := server.BoolArg(args, "simulate", false)
	if err != nil {
		return server.Result{}, err
	}

	opts.KeyName = record.KeyName
	opts.Password = record.Password
	opts.Master = record.MasterAddress
	opts.Remote = record.RPCURL
	opts.ChainID = record.ChainID

	if gasErr := sizeGas(ctx, d, &opts); gasErr != nil {
		return server.Result{}, gasErr
	}

	opts.Simulate = simulateOnly

	result, err := d.Gnokey.MakeTx(ctx, opts)
	if err != nil {
		return server.Result{}, txError(err)
	}

	verb := "Broadcast"
	if simulateOnly {
		verb = "Simulated"
	}

	text := fmt.Sprintf("%s %s. Signed by session %s on behalf of %s.\nGas wanted %d, fee %s.\n%s",
		verb, opts.Kind, record.SessionAddress, record.MasterAddress, opts.GasWanted, opts.GasFee,
		strings.TrimSpace(result.Output))

	return server.Result{
		Text: text,
		StructuredContent: map[string]any{
			"simulated":       simulateOnly,
			"tx_hash":         result.TxHash,
			"height":          result.Height,
			"gas_wanted":      opts.GasWanted,
			"gas_used":        result.GasUsed,
			"gas_fee":         opts.GasFee,
			"session_address": record.SessionAddress,
			"master_address":  record.MasterAddress,
		},
	}, nil
}

func applyCommonTxArgs(args map[string]any, opts *gnokey.TxOptions) error {
	gasWanted, err := server.IntArg(args, "gas_wanted", 0)
	if err != nil {
		return err
	}

	if gasWanted < 0 {
		return server.InvalidArg("gas_wanted", "must be positive")
	}

	gasFee, err := server.StringArg(args, "gas_fee")
	if err != nil {
		return err
	}

	maxDeposit, err := server.StringArg(args, "max_deposit")
	if err != nil {
		return err
	}

	opts.GasWanted = gasWanted
	opts.GasFee = gasFee
	opts.MaxDeposit = maxDeposit

	return nil
}

func selectSession(d *Deps, args map[string]any, route, pkgPath string) (session.Record, error) {
	address, err := server.StringArg(args, "session_address")
	if err != nil {
		return session.Record{}, err
	}

	now := d.Now()

	if address != "" {
		record, getErr := d.Store.Get(address)
		if getErr != nil {
			return session.Record{}, &server.ToolError{
				Code:    "session_unknown",
				Message: "this server holds no session " + address,
			}
		}

		if !record.Usable(now) {
			return session.Record{}, &server.ToolError{
				Code:    "session_expired",
				Message: "session " + address + " is revoked or expired; create a new one with adena_session_create",
			}
		}

		if !record.Allows(route, pkgPath) {
			return session.Record{}, scopeError(route, pkgPath)
		}

		return record, nil
	}

	records, err := d.Store.List()
	if err != nil {
		return session.Record{}, err
	}

	for i := range records {
		if records[i].Usable(now) && records[i].Allows(route, pkgPath) {
			return records[i], nil
		}
	}

	return session.Record{}, scopeError(route, pkgPath)
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

// sizeGas fills in the gas limit and fee the caller left out.
func sizeGas(ctx context.Context, d *Deps, opts *gnokey.TxOptions) error {
	if opts.GasWanted > 0 && opts.GasFee != "" {
		return nil
	}

	p := gasPrice(ctx, d, opts.Remote)

	if opts.GasWanted == 0 {
		measure := *opts
		measure.Simulate = true
		measure.GasWanted = d.Config.GasCeiling
		measure.GasFee = feeFor(d.Config.GasCeiling, p)

		result, err := d.Gnokey.MakeTx(ctx, measure)
		if err != nil {
			return txError(err)
		}

		opts.GasWanted = max(result.GasUsed*3/2, minGasWanted)
	}

	if opts.GasFee == "" {
		opts.GasFee = feeFor(opts.GasWanted, p)
	}

	return nil
}

// price is a gas price of amount ugnot per gas units.
type price struct {
	amount int64
	gas    int64
}

var floorPrice = price{amount: floorPriceAmount, gas: floorPriceGas}

// gasPrice reads the chain gas price, falling back to the genesis floor when
// the query fails.
func gasPrice(ctx context.Context, d *Deps, remote string) price {
	data, err := d.Gnokey.Query(ctx, remote, "auth/gasprice")
	if err != nil {
		return floorPrice
	}

	var raw struct {
		Price string          `json:"price"`
		Gas   json.RawMessage `json:"gas"`
	}

	if json.Unmarshal([]byte(data), &raw) != nil {
		return floorPrice
	}

	gasUnits, gasErr := strconv.ParseInt(strings.Trim(string(raw.Gas), `"`), 10, 64)
	match := gasPricePattern.FindStringSubmatch(raw.Price)

	if gasErr != nil || gasUnits <= 0 || match == nil {
		return floorPrice
	}

	ugnot, parseErr := strconv.ParseInt(match[1], 10, 64)
	if parseErr != nil || ugnot <= 0 {
		return floorPrice
	}

	return price{amount: ugnot, gas: gasUnits}
}

func feeFor(gasWanted int64, p price) string {
	fee := (gasWanted*p.amount + p.gas - 1) / p.gas

	return strconv.FormatInt(max(fee, 1), 10) + "ugnot"
}

func txError(err error) error {
	var cmdErr *gnokey.CommandError
	if !errors.As(err, &cmdErr) {
		return err
	}

	output := strings.TrimSpace(cmdErr.Output)
	lower := strings.ToLower(output)

	switch {
	case strings.Contains(lower, "session not allowed") || strings.Contains(lower, "not allowed by session"):
		return &server.ToolError{
			Code:    "session_scope",
			Message: "the chain refused the session for this message (scope or spend limit): " + output,
		}
	case strings.Contains(lower, "expired"):
		return &server.ToolError{
			Code:    "session_expired",
			Message: "the session has expired on chain: " + output,
		}
	default:
		return &server.ToolError{Code: "transaction_failed", Message: output}
	}
}
