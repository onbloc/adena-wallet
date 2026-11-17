package tools

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
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

const spendDenom = "ugnot"

func registerCreateSession(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "create_session",
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
			"spend_limit": stringProp(`One ugnot amount the session may spend, gas fees included, e.g. ` +
				`"5000000ugnot". It cannot exceed the maximum the user set in Adena (max_spend_limit in ` +
				"get_status). Default: " + config.DefaultSpendLimit + " or that maximum, whichever is lower."),
			"spend_period": map[string]any{
				"type":        "integer",
				"minimum":     0,
				"description": "Seconds after which the spend limit resets; 0 (default) makes it a lifetime cap.",
			},
			"expires_in": stringProp(`Session lifetime as a Go duration, e.g. "30m" or "2h". ` +
				"Default 1h, at most 168h."),
		}, "allow_paths"),
		Annotations: server.Annotations{OpenWorld: true},
		Handler: func(ctx context.Context, args map[string]any) (server.Result, error) {
			return sessionCreateHandler(ctx, d, args)
		},
	})
}

type createArgs struct {
	spendLimit  string
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

	if spendLimit != "" {
		if coin, parseErr := std.ParseCoin(spendLimit); parseErr != nil || coin.Denom != spendDenom || !coin.IsPositive() {
			return createArgs{}, server.InvalidArg("spend_limit", `must be one positive ugnot amount such as "5000000ugnot"`)
		}
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

	return createArgs{
		allowPaths:  allowPaths,
		spendLimit:  spendLimit,
		spendPeriod: spendPeriod,
		expiresIn:   expiresIn,
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
	if callErr := d.Bridge.Call(approvalCtx, bridge.MethodGetAccount, agentParams(ctx), &account); callErr != nil {
		return server.Result{}, bridgeError(callErr)
	}

	if in.spendLimit == "" {
		in.spendLimit = defaultSpendLimit(approvalCtx, d, agentParams(ctx))
	}

	key, err := sessionkey.Generate()
	if err != nil {
		return server.Result{}, err
	}

	now := d.Now()

	record, err := authorizeKey(approvalCtx, d, key, &account, in, now, agentName(ctx))
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
	b.WriteString("send_transaction and sign_transaction now sign with this session; call revoke_session when done.\n")

	return server.Result{Text: b.String(), StructuredContent: d.publicRecord(&record)}, nil
}

func authorizeKey(
	ctx context.Context,
	d *Deps,
	key *sessionkey.Key,
	account *bridge.Account,
	in createArgs,
	now time.Time,
	agent string,
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
		AgentName:        agent,
		MasterAddress:    account.Address,
		ChainID:          account.ChainID,
	}, &tx); callErr != nil {
		return session.Record{}, bridgeError(callErr)
	}

	// The network that authorized the session, which Adena reports with the
	// result; get_account ran earlier and the user may have switched since.
	authorized := bridge.Account{Address: tx.MasterAddress, ChainID: tx.ChainID, RPCURL: tx.RPCURL}
	if authorized.Address == "" || authorized.ChainID == "" || authorized.RPCURL == "" {
		authorized = *account
	}

	return session.Record{
		SessionAddress:   key.Address(),
		SessionPublicKey: publicKey,
		MasterAddress:    authorized.Address,
		ChainID:          authorized.ChainID,
		RPCURL:           authorized.RPCURL,
		AllowPaths:       in.allowPaths,
		SpendLimit:       in.spendLimit,
		SpendPeriod:      in.spendPeriod,
		ExpiresAt:        expiresAt,
		CreatedAt:        now.Unix(),
		TxHash:           tx.TxHash,
		AgentName:        agent,
		Status:           session.StatusActive,
	}, nil
}

// defaultSpendLimit keeps the default within the user's maximum, so a request
// without spend_limit is not refused by Adena.
func defaultSpendLimit(ctx context.Context, d *Deps, params bridge.AgentParams) string {
	fallback, err := std.ParseCoin(config.DefaultSpendLimit)
	if err != nil {
		return config.DefaultSpendLimit
	}

	var status bridge.Status
	if d.Bridge.Call(ctx, bridge.MethodGetStatus, params, &status) != nil || status.MaxSpendLimit == "" {
		return config.DefaultSpendLimit
	}

	maximum, err := std.ParseCoin(status.MaxSpendLimit)
	if err != nil || maximum.Denom != fallback.Denom || !maximum.IsLT(fallback) {
		return config.DefaultSpendLimit
	}

	return maximum.String()
}

func registerGetSessions(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "get_sessions",
		Description: "Lists the sessions this agent created. key_held tells whether this server process " +
			"holds the key and can sign with it. With refresh=true each session is looked up on chain, " +
			"and sessions the chain no longer knows (revoked or expired) are marked.",
		InputSchema: objectSchema(map[string]any{
			"refresh": map[string]any{"type": "boolean", "description": "Check each session on chain."},
		}),
		Annotations: server.Annotations{ReadOnly: true, Idempotent: true, OpenWorld: true},
		Handler: func(ctx context.Context, args map[string]any) (server.Result, error) {
			return getSessionsHandler(ctx, d, args)
		},
	})
}

func getSessionsHandler(ctx context.Context, d *Deps, args map[string]any) (server.Result, error) {
	refresh, err := server.BoolArg(args, "refresh", false)
	if err != nil {
		return server.Result{}, err
	}

	records, err := d.agentRecords(ctx)
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

func registerRevokeSession(r *server.Registry, d *Deps) {
	r.Add(&server.Tool{
		Name: "revoke_session",
		Description: "Asks the user to revoke a session in Adena, then destroys the session key. " +
			"Call it when the task is done. Blocks until the user approves or rejects. Works for " +
			"sessions whose key was lost in a restart too. With forget_only=true the record and key " +
			"are dropped without asking, for sessions already revoked or expired on chain.",
		InputSchema: objectSchema(map[string]any{
			"session_address": stringProp("Address of the session, from create_session or get_sessions."),
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

	record, err := d.agentRecord(ctx, address)
	if err != nil {
		return server.Result{}, &server.ToolError{
			Code:    "session_unknown",
			Message: "this server holds no session " + address + "; get_sessions shows the ones it holds",
		}
	}

	var tx bridge.SessionTxResult

	if !forgetOnly {
		approvalCtx, cancel := context.WithTimeout(ctx, d.Config.ApprovalTimeout)
		defer cancel()

		if callErr := d.Bridge.Call(approvalCtx, bridge.MethodRevokeSession, bridge.RevokeSessionParams{
			SessionPublicKey: record.SessionPublicKey,
			AgentName:        agentName(ctx),
			MasterAddress:    record.MasterAddress,
			ChainID:          record.ChainID,
		}, &tx); callErr != nil {
			return server.Result{}, bridgeError(callErr)
		}
	}

	if !forgetOnly {
		if err := confirmRevoked(&record, &tx); err != nil {
			return server.Result{}, err
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

// confirmRevoked keeps the key and record unless Adena reports the revoke as
// committed on the session's own account and chain.
func confirmRevoked(record *session.Record, tx *bridge.SessionTxResult) error {
	switch {
	case tx.ChainID != record.ChainID || tx.MasterAddress != record.MasterAddress:
		return &server.ToolError{
			Code: "revoke_unconfirmed",
			Message: fmt.Sprintf("Adena revoked on %s as %s, but the session belongs to %s on %s; the key is "+
				"kept. Check get_sessions with refresh=true", tx.ChainID, tx.MasterAddress, record.MasterAddress,
				record.ChainID),
		}
	case tx.CommittedHeight() == 0:
		return &server.ToolError{
			Code: "revoke_unconfirmed",
			Message: "Adena did not report the revoke as committed; the key is kept. Check get_sessions " +
				"with refresh=true before revoking again",
		}
	default:
		return nil
	}
}
