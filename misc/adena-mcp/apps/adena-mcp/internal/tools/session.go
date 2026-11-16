package tools

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/chain"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/config"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/sessionkey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

func registerSessionCreate(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "adena_session_create",
		Description: "Creates a session key and asks the user to authorize it in Adena. The user " +
			"reviews and signs the session with their master account. The key has no seed phrase, " +
			"exists only in this server's locked memory and is never shown to anyone, so it is lost " +
			"when the server restarts. Blocks until the user approves or rejects. Keep allow_paths " +
			"narrow, the spend limit low and the lifetime short. spend_limit also pays gas for every write.",
		InputSchema: objectSchema(map[string]any{
			"allow_paths": map[string]any{
				"type":     "array",
				"items":    map[string]any{"type": "string"},
				"minItems": 1,
				"maxItems": 8,
				"description": `Message types the session may sign: "vm/exec:<realm path>" for calls to a realm ` +
					`and its sub-paths, "vm/exec" for any realm, "vm/run", "bank/send". "*" is refused by Adena.`,
			},
			"spend_limit": stringProp("Coins the session may spend, including gas fees. " +
				"Must include ugnot. Default " + config.DefaultSpendLimit + "."),
			"spend_period": map[string]any{
				"type":        "integer",
				"minimum":     0,
				"description": "Seconds after which the spend limit resets; 0 (default) makes it a lifetime cap.",
			},
			"expires_in": stringProp(`Session lifetime as a Go duration, e.g. "30m" or "2h". ` +
				"Default 1h, at most 168h."),
			"agent_name": stringProp("Short name shown to the user as the requester. Default adena-mcp."),
		}, "allow_paths"),
		Annotations: server.Annotations{OpenWorld: true},
		Handler: func(ctx context.Context, args map[string]any) (server.Result, error) {
			return sessionCreateHandler(ctx, d, args)
		},
	})
}

type createArgs struct {
	spendLimit  string
	agentName   string
	allowPaths  []string
	spendPeriod int64
	expiresIn   time.Duration
}

func parseCreateArgs(args map[string]any) (createArgs, error) {
	allowPaths, err := server.StringSliceArg(args, "allow_paths")
	if err != nil {
		return createArgs{}, err
	}

	if len(allowPaths) == 0 {
		return createArgs{}, server.InvalidArg("allow_paths", "at least one entry is required")
	}

	spendLimit, err := server.StringArg(args, "spend_limit")
	if err != nil {
		return createArgs{}, err
	}

	if spendLimit == "" {
		spendLimit = config.DefaultSpendLimit
	}

	spendPeriod, err := server.IntArg(args, "spend_period", 0)
	if err != nil {
		return createArgs{}, err
	}

	if spendPeriod < 0 {
		return createArgs{}, server.InvalidArg("spend_period", "must not be negative")
	}

	expiresIn := config.DefaultSessionTTL

	raw, err := server.StringArg(args, "expires_in")
	if err != nil {
		return createArgs{}, err
	}

	if raw != "" {
		expiresIn, err = time.ParseDuration(raw)
		if err != nil || expiresIn <= 0 {
			return createArgs{}, server.InvalidArg("expires_in", "must be a positive duration such as 1h")
		}
	}

	if expiresIn > config.MaxSessionTTL {
		return createArgs{}, server.InvalidArg("expires_in", "must be at most "+config.MaxSessionTTL.String())
	}

	agentName, err := server.StringArg(args, "agent_name")
	if err != nil {
		return createArgs{}, err
	}

	if agentName == "" {
		agentName = config.DefaultAgentName
	}

	return createArgs{
		allowPaths:  allowPaths,
		spendLimit:  spendLimit,
		spendPeriod: spendPeriod,
		expiresIn:   expiresIn,
		agentName:   agentName,
	}, nil
}

func sessionCreateHandler(ctx context.Context, d *Deps, args map[string]any) (server.Result, error) {
	in, err := parseCreateArgs(args)
	if err != nil {
		return server.Result{}, err
	}

	approvalCtx, cancel := context.WithTimeout(ctx, d.Config.ApprovalTimeout)
	defer cancel()

	var account bridge.Account
	if callErr := d.Bridge.Call(approvalCtx, bridge.MethodGetAccount, nil, &account); callErr != nil {
		return server.Result{}, bridgeError(callErr)
	}

	key, err := sessionkey.Generate()
	if err != nil {
		return server.Result{}, err
	}

	now := d.Now()

	record, err := authorizeKey(approvalCtx, d, key, &account, in, now)
	if err != nil {
		key.Destroy()

		return server.Result{}, err
	}

	d.Keys.Put(key)

	if err := d.Store.Put(record); err != nil {
		return server.Result{}, fmt.Errorf("the session is live on chain but could not be saved: %w", err)
	}

	var b strings.Builder

	fmt.Fprintf(&b, "Session %s authorized by %s on %s.\n", record.SessionAddress, record.MasterAddress, record.ChainID)
	fmt.Fprintf(&b, "Allow paths: %v. Spend limit: %s. Expires: %s.\n",
		record.AllowPaths, record.SpendLimit, formatTime(record.ExpiresAt))
	b.WriteString("Use adena_call, adena_run or adena_send to act as the user, and adena_session_revoke when done.\n")

	return server.Result{Text: b.String(), StructuredContent: d.publicRecord(&record)}, nil
}

func authorizeKey(
	ctx context.Context,
	d *Deps,
	key *sessionkey.Key,
	account *bridge.Account,
	in createArgs,
	now time.Time,
) (session.Record, error) {
	publicKey := base64.StdEncoding.EncodeToString(key.PublicKey())
	expiresAt := now.Add(in.expiresIn).Unix()

	var tx bridge.SessionTxResult
	if callErr := d.Bridge.Call(ctx, bridge.MethodCreateSession, bridge.CreateSessionParams{
		SessionPublicKey: publicKey,
		AllowPaths:       in.allowPaths,
		SpendLimit:       in.spendLimit,
		SpendPeriod:      in.spendPeriod,
		ExpiresAt:        expiresAt,
		AgentName:        in.agentName,
	}, &tx); callErr != nil {
		return session.Record{}, bridgeError(callErr)
	}

	master := tx.MasterAddress
	if master == "" {
		master = account.Address
	}

	return session.Record{
		SessionAddress:   key.Address(),
		SessionPublicKey: publicKey,
		MasterAddress:    master,
		ChainID:          account.ChainID,
		RPCURL:           account.RPCURL,
		AllowPaths:       in.allowPaths,
		SpendLimit:       in.spendLimit,
		SpendPeriod:      in.spendPeriod,
		ExpiresAt:        expiresAt,
		CreatedAt:        now.Unix(),
		TxHash:           tx.TxHash,
		Status:           session.StatusActive,
	}, nil
}

func registerSessionList(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "adena_session_list",
		Description: "Lists the session keys this server holds. With refresh=true each session is " +
			"looked up on chain, and sessions the chain no longer knows (revoked or expired) are marked.",
		InputSchema: objectSchema(map[string]any{
			"refresh": map[string]any{"type": "boolean", "description": "Check each session on chain."},
		}),
		Annotations: server.Annotations{ReadOnly: true, Idempotent: true, OpenWorld: true},
		Handler: func(ctx context.Context, args map[string]any) (server.Result, error) {
			return sessionListHandler(ctx, d, args)
		},
	})
}

func sessionListHandler(ctx context.Context, d *Deps, args map[string]any) (server.Result, error) {
	refresh, err := server.BoolArg(args, "refresh", false)
	if err != nil {
		return server.Result{}, err
	}

	records, err := d.Store.List()
	if err != nil {
		return server.Result{}, err
	}

	out := make([]map[string]any, 0, len(records))

	for i := range records {
		r := &records[i]
		entry := d.publicRecord(r)

		if refresh {
			onChain, queryErr := querySession(ctx, d, r)

			switch {
			case queryErr != nil:
				entry["chain_error"] = queryErr.Error()
			case !onChain && r.Status == session.StatusActive:
				r.Status = session.StatusRevoked
				if putErr := d.Store.Put(*r); putErr != nil {
					return server.Result{}, putErr
				}

				entry = d.publicRecord(r)
			}

			entry["on_chain"] = onChain
		}

		out = append(out, entry)
	}

	text, err := json.MarshalIndent(out, "", "  ")
	if err != nil {
		return server.Result{}, fmt.Errorf("encode sessions: %w", err)
	}

	return server.Result{Text: string(text), StructuredContent: map[string]any{"sessions": out}}, nil
}

// querySession reports whether the chain still holds the session.
func querySession(ctx context.Context, d *Deps, r *session.Record) (bool, error) {
	_, err := d.Chain.SessionAccount(ctx, r.RPCURL, r.MasterAddress, r.SessionAddress)
	if errors.Is(err, chain.ErrSessionNotFound) {
		return false, nil
	}

	return err == nil, err
}

func registerSessionRevoke(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "adena_session_revoke",
		Description: "Asks the user to revoke a session in Adena, then destroys the session key. " +
			"Call it when the task is done. Blocks until the user approves or rejects. Works for " +
			"sessions whose key was lost in a restart too. With forget_only=true the record and key " +
			"are dropped without asking, for sessions already revoked or expired on chain.",
		InputSchema: objectSchema(map[string]any{
			"session_address": stringProp("Address of the session, from adena_session_create or adena_session_list."),
			"forget_only":     map[string]any{"type": "boolean", "description": "Only delete the local key."},
		}, "session_address"),
		Annotations: server.Annotations{Destructive: true, OpenWorld: true},
		Handler: func(ctx context.Context, args map[string]any) (server.Result, error) {
			return sessionRevokeHandler(ctx, d, args)
		},
	})
}

func sessionRevokeHandler(ctx context.Context, d *Deps, args map[string]any) (server.Result, error) {
	address, err := server.RequiredStringArg(args, "session_address")
	if err != nil {
		return server.Result{}, err
	}

	forgetOnly, err := server.BoolArg(args, "forget_only", false)
	if err != nil {
		return server.Result{}, err
	}

	record, err := d.Store.Get(address)
	if err != nil {
		return server.Result{}, &server.ToolError{
			Code:    "session_unknown",
			Message: "this server holds no session " + address + "; adena_session_list shows the ones it holds",
		}
	}

	var tx bridge.SessionTxResult

	if !forgetOnly {
		approvalCtx, cancel := context.WithTimeout(ctx, d.Config.ApprovalTimeout)
		defer cancel()

		if callErr := d.Bridge.Call(approvalCtx, bridge.MethodRevokeSession, bridge.RevokeSessionParams{
			SessionPublicKey: record.SessionPublicKey,
			AgentName:        config.DefaultAgentName,
		}, &tx); callErr != nil {
			return server.Result{}, bridgeError(callErr)
		}
	}

	d.Keys.Destroy(address)

	if err := d.Store.Delete(address); err != nil {
		return server.Result{}, err
	}

	text := fmt.Sprintf("Session %s revoked by %s and its key destroyed.", address, record.MasterAddress)
	if forgetOnly {
		text = fmt.Sprintf("Session %s forgotten locally; nothing was sent to the chain.", address)
	}

	return server.Result{
		Text: text,
		StructuredContent: map[string]any{
			"session_address": address,
			"revoked":         !forgetOnly,
			"tx_hash":         tx.TxHash,
		},
	}, nil
}
