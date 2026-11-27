package tools

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/gnolang/gno/tm2/pkg/std"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/chain"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
)

const (
	verifyAttempts   = 3
	verifyRetryDelay = time.Second
)

// errSessionMissing means Adena reported the session as approved but the chain
// has none for this server's key.
var errSessionMissing = errors.New("no session for this key on chain")

// sessionMismatchError lists how the approved session differs from the request.
type sessionMismatchError struct {
	onChain *chain.Session
	fields  []string
}

func (m *sessionMismatchError) Error() string {
	return "the session on chain differs from the request: " + strings.Join(m.fields, "; ")
}

// verifyOnChain checks that the session the user approved is the one this
// server asked for: this key, scope, budget and expiry. A difference means the
// request was changed on its way to Adena. An unreachable chain is reported as
// a warning, since the session itself was committed.
func verifyOnChain(ctx context.Context, d *Deps, record *session.Record) (string, error) {
	var (
		onChain *chain.Session
		err     error
	)

	for attempt := range verifyAttempts {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return "", ctx.Err()
			case <-time.After(d.verifyDelay()):
			}
		}

		onChain, err = d.Chain.SessionAccount(ctx, record.RPCURL, record.MasterAddress, record.SessionAddress)
		if err == nil {
			break
		}
	}

	switch {
	case errors.Is(err, chain.ErrSessionNotFound):
		return "", errSessionMissing
	case err != nil:
		return fmt.Sprintf("Could not confirm the session on chain (%v); check get_sessions with refresh=true.", err), nil
	}

	if fields := mismatchedFields(onChain, record); len(fields) > 0 {
		return "", &sessionMismatchError{onChain: onChain, fields: fields}
	}

	return "", nil
}

func (d *Deps) verifyDelay() time.Duration {
	if d.VerifyRetryDelay > 0 {
		return d.VerifyRetryDelay
	}

	return verifyRetryDelay
}

func mismatchedFields(onChain *chain.Session, record *session.Record) []string {
	var fields []string

	if got := onChain.MasterAddress.String(); got != record.MasterAddress {
		fields = append(fields, fmt.Sprintf("master %s, requested %s", got, record.MasterAddress))
	}

	if !samePaths(onChain.AllowPaths, record.AllowPaths) {
		fields = append(fields, fmt.Sprintf("allow_paths %v, requested %v", onChain.AllowPaths, record.AllowPaths))
	}

	if got, want := onChain.SpendLimit.String(), normalizeCoins(record.SpendLimit); got != want {
		fields = append(fields, fmt.Sprintf("spend_limit %s, requested %s", got, want))
	}

	if onChain.SpendPeriod != record.SpendPeriod {
		fields = append(fields, fmt.Sprintf("spend_period %d, requested %d", onChain.SpendPeriod, record.SpendPeriod))
	}

	if onChain.ExpiresAt != record.ExpiresAt {
		fields = append(fields, fmt.Sprintf("expires_at %d, requested %d", onChain.ExpiresAt, record.ExpiresAt))
	}

	return fields
}

func samePaths(a, b []string) bool {
	x, y := slices.Clone(a), slices.Clone(b)
	slices.Sort(x)
	slices.Sort(y)

	return slices.Equal(slices.Compact(x), slices.Compact(y))
}

func normalizeCoins(raw string) string {
	coins, err := std.ParseCoins(raw)
	if err != nil {
		return raw
	}

	return coins.String()
}

// rejectUnverified reports a session that failed verification. A mismatched
// session is kept without its key, so revoke_session can still remove it.
func rejectUnverified(d *Deps, record *session.Record, err error) error {
	var mismatch *sessionMismatchError
	if errors.As(err, &mismatch) {
		record.AllowPaths = mismatch.onChain.AllowPaths
		record.SpendLimit = mismatch.onChain.SpendLimit.String()
		record.SpendPeriod = mismatch.onChain.SpendPeriod
		record.ExpiresAt = mismatch.onChain.ExpiresAt

		toolErr := &server.ToolError{
			Code: "session_mismatch",
			Message: mismatch.Error() + ". The request was changed between this server and Adena, so " +
				"the key was destroyed. Call revoke_session for " + record.SessionAddress + ", and have the " +
				"user check Adena > Manage Sessions and the agent host installation",
			Extra: map[string]any{"session_address": record.SessionAddress},
		}

		if saveErr := d.Store.Put(*record); saveErr != nil {
			toolErr.Message += fmt.Sprintf(" (it could not be recorded for revoke_session: %v; revoke it in Adena)", saveErr)
		}

		return toolErr
	}

	if errors.Is(err, errSessionMissing) {
		return &server.ToolError{
			Code: "session_not_found",
			Message: "Adena reported the session as approved, but the chain has no session for this " +
				"server's key " + record.SessionAddress + ". The request may have been changed on its way " +
				"to Adena: have the user revoke any session they do not recognize in Adena > Manage " +
				"Sessions, and reinstall the agent host (npx -y @adena-wallet/mcp install-host)",
		}
	}

	return err
}
