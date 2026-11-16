package tools

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log/slog"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gnolang/gno/gno.land/pkg/sdk/vm"
	"github.com/gnolang/gno/tm2/pkg/crypto"
	"github.com/gnolang/gno/tm2/pkg/std"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/chain"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/config"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/sessionkey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

var testNow = time.Unix(1_800_000_000, 0)

type fakeBridge struct {
	errs   map[string]error
	params map[string]json.RawMessage
	mu     sync.Mutex
}

func (f *fakeBridge) Call(_ context.Context, method string, params, out any) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.params == nil {
		f.params = map[string]json.RawMessage{}
	}

	raw, err := json.Marshal(params)
	if err != nil {
		return err
	}

	f.params[method] = raw

	if callErr := f.errs[method]; callErr != nil {
		return callErr
	}

	var result any

	switch method {
	case bridge.MethodGetAccount:
		result = bridge.Account{Address: "g1master", ChainID: "dev", RPCURL: "http://rpc"}
	case bridge.MethodCreateSession, bridge.MethodRevokeSession:
		result = bridge.SessionTxResult{TxHash: "hash", MasterAddress: "g1master", ChainID: "dev"}
	default:
		result = map[string]any{}
	}

	data, err := json.Marshal(result)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, out)
}

type fakeChain struct {
	missing  map[string]bool
	requests []chain.TxRequest
	mu       sync.Mutex
}

func (f *fakeChain) Execute(_ context.Context, req chain.TxRequest) (chain.TxResult, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.requests = append(f.requests, req)

	if _, err := req.Msg(crypto.Address{}); err != nil {
		return chain.TxResult{}, err
	}

	if _, err := req.Signer.Sign([]byte("probe")); err != nil {
		return chain.TxResult{}, err
	}

	return chain.TxResult{TxHash: "txhash", Height: 7, GasWanted: 300_000, GasUsed: 200_000, GasFee: "300ugnot"}, nil
}

func (f *fakeChain) SessionAccount(_ context.Context, _, _, session string) (*std.BaseSessionAccount, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.missing[session] {
		return nil, chain.ErrSessionNotFound
	}

	return &std.BaseSessionAccount{}, nil
}

type testEnv struct {
	bridge *fakeBridge
	chain  *fakeChain
	keys   *sessionkey.Keyring
	store  *session.Store
	tools  map[string]*server.Tool
}

func newEnv(t *testing.T) *testEnv {
	t.Helper()

	env := &testEnv{
		bridge: &fakeBridge{},
		chain:  &fakeChain{missing: map[string]bool{}},
		keys:   sessionkey.NewKeyring(),
		store:  session.NewStore(filepath.Join(t.TempDir(), "sessions.json")),
		tools:  map[string]*server.Tool{},
	}

	registry := server.NewRegistry()
	Register(registry, &Deps{
		Bridge: env.bridge,
		Chain:  env.chain,
		Keys:   env.keys,
		Store:  env.store,
		Now:    func() time.Time { return testNow },
		Config: config.Config{ApprovalTimeout: time.Minute, GasCeiling: 10_000_000},
	})

	for _, tool := range registry.All() {
		env.tools[tool.Name] = tool
	}

	return env
}

func (e *testEnv) call(t *testing.T, name string, args map[string]any) (server.Result, error) {
	t.Helper()

	tool, ok := e.tools[name]
	if !ok {
		t.Fatalf("tool %s not registered", name)
	}

	return tool.Handler(context.Background(), args)
}

func toolErrorCode(err error) string {
	var te *server.ToolError
	if errors.As(err, &te) {
		return te.Code
	}

	return ""
}

func TestSessionCreateStoresApprovedSession(t *testing.T) {
	t.Parallel()

	env := newEnv(t)

	res, err := env.call(t, "adena_session_create", map[string]any{
		"allow_paths": []any{"vm/exec:gno.land/r/demo/counter"},
		"expires_in":  "30m",
	})
	if err != nil {
		t.Fatal(err)
	}

	var sent bridge.CreateSessionParams
	if decodeErr := json.Unmarshal(env.bridge.params[bridge.MethodCreateSession], &sent); decodeErr != nil {
		t.Fatal(decodeErr)
	}

	if sent.ExpiresAt != testNow.Add(30*time.Minute).Unix() || sent.SpendLimit != config.DefaultSpendLimit {
		t.Fatalf("unexpected request %+v", sent)
	}

	address, ok := res.StructuredContent["session_address"].(string)
	if !ok {
		t.Fatalf("no session address in %+v", res.StructuredContent)
	}

	key, held := env.keys.Get(address)
	if !held || base64.StdEncoding.EncodeToString(key.PublicKey()) != sent.SessionPublicKey {
		t.Fatal("the authorized public key must belong to the held key")
	}

	record, err := env.store.Get(address)
	if err != nil {
		t.Fatal(err)
	}

	if record.MasterAddress != "g1master" || record.RPCURL != "http://rpc" {
		t.Fatalf("unexpected record %+v", record)
	}
}

func TestSessionCreateDestroysKeyWhenRejected(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	env.bridge.errs = map[string]error{
		bridge.MethodCreateSession: &bridge.Error{Code: bridge.CodeRejected, Message: "no"},
	}

	_, err := env.call(t, "adena_session_create", map[string]any{"allow_paths": []any{"bank/send"}})
	if toolErrorCode(err) != "user_rejected" {
		t.Fatalf("got %v, want user_rejected", err)
	}

	records, err := env.store.List()
	if err != nil || len(records) != 0 {
		t.Fatalf("nothing should be stored, got %+v %v", records, err)
	}
}

func TestStoredRecordsHoldNoKeyMaterial(t *testing.T) {
	t.Parallel()

	env := newEnv(t)

	if _, err := env.call(t, "adena_session_create", map[string]any{"allow_paths": []any{"bank/send"}}); err != nil {
		t.Fatal(err)
	}

	records, err := env.store.List()
	if err != nil || len(records) != 1 {
		t.Fatalf("got %+v %v", records, err)
	}

	data, err := json.Marshal(records[0])
	if err != nil {
		t.Fatal(err)
	}

	for _, field := range []string{"password", "key_name", "private", "mnemonic"} {
		if strings.Contains(string(data), field) {
			t.Fatalf("record contains %q: %s", field, data)
		}
	}
}

func TestSessionCreateRejectsLongLifetime(t *testing.T) {
	t.Parallel()

	env := newEnv(t)

	_, err := env.call(t, "adena_session_create", map[string]any{
		"allow_paths": []any{"bank/send"},
		"expires_in":  "200h",
	})
	if toolErrorCode(err) != "invalid_argument" {
		t.Fatalf("got %v, want invalid_argument", err)
	}
}

func putSession(t *testing.T, env *testEnv, allowPaths ...string) string {
	t.Helper()

	key, err := sessionkey.Generate()
	if err != nil {
		t.Fatal(err)
	}

	env.keys.Put(key)

	if err := env.store.Put(session.Record{
		SessionAddress: key.Address(),
		MasterAddress:  "g1master",
		ChainID:        "dev",
		RPCURL:         "http://rpc",
		AllowPaths:     allowPaths,
		ExpiresAt:      testNow.Add(time.Hour).Unix(),
		CreatedAt:      testNow.Unix(),
		Status:         session.StatusActive,
	}); err != nil {
		t.Fatal(err)
	}

	return key.Address()
}

func TestCallSignsWithSessionOnBehalfOfMaster(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	address := putSession(t, env, "vm/exec:gno.land/r/demo")

	res, err := env.call(t, "adena_call", map[string]any{
		"pkg_path": "gno.land/r/demo/counter",
		"func":     "Incr",
		"args":     []any{"1"},
		"send":     "5ugnot",
	})
	if err != nil {
		t.Fatal(err)
	}

	if len(env.chain.requests) != 1 {
		t.Fatalf("got %d requests", len(env.chain.requests))
	}

	req := env.chain.requests[0]
	if req.Master != "g1master" || req.Signer.Address() != address || req.GasWanted != 0 || req.GasCeiling != 10_000_000 {
		t.Fatalf("unexpected request %+v", req)
	}

	msg, err := req.Msg(crypto.Address{1})
	if err != nil {
		t.Fatal(err)
	}

	call, ok := msg.(vm.MsgCall)
	if !ok || call.Caller != (crypto.Address{1}) || call.PkgPath != "gno.land/r/demo/counter" ||
		call.Send.String() != "5ugnot" {
		t.Fatalf("unexpected message %#v", msg)
	}

	if res.StructuredContent["tx_hash"] != "txhash" {
		t.Fatalf("unexpected result %+v", res.StructuredContent)
	}
}

func TestCallRequiresMatchingSession(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/exec:gno.land/r/demo")

	_, err := env.call(t, "adena_call", map[string]any{"pkg_path": "gno.land/r/demo_evil", "func": "Drain"})
	if toolErrorCode(err) != "session_required" {
		t.Fatalf("got %v, want session_required", err)
	}

	if len(env.chain.requests) != 0 {
		t.Fatal("nothing must be signed without a matching session")
	}
}

func TestCallPassesExplicitGas(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/exec")

	_, err := env.call(t, "adena_call", map[string]any{
		"pkg_path":   "gno.land/r/demo/counter",
		"func":       "Incr",
		"gas_wanted": float64(50_000),
		"gas_fee":    "50ugnot",
	})
	if err != nil {
		t.Fatal(err)
	}

	if req := env.chain.requests[0]; req.GasWanted != 50_000 || req.GasFee != "50ugnot" {
		t.Fatalf("got %+v", req)
	}
}

func TestCallReportsLostKey(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	address := putSession(t, env, "vm/exec")
	env.keys.Destroy(address)

	_, err := env.call(t, "adena_call", map[string]any{
		"pkg_path": "gno.land/r/x", "func": "F", "session_address": address,
	})
	if toolErrorCode(err) != "session_key_lost" {
		t.Fatalf("got %v, want session_key_lost", err)
	}
}

func TestRunRequiresMainPackage(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/run")

	_, err := env.call(t, "adena_run", map[string]any{"code": "package foo\nfunc main() {}\n"})
	if toolErrorCode(err) != "invalid_argument" {
		t.Fatalf("got %v, want invalid_argument", err)
	}
}

func TestTxErrorMapsSpendLimit(t *testing.T) {
	t.Parallel()

	err := txError(&chain.SpendError{Outflow: "10ugnot", Limit: "5ugnot", Used: "0ugnot"})
	if toolErrorCode(err) != "session_spend_limit" {
		t.Fatalf("got %v", err)
	}
}

func TestSendRequiresBankSend(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/exec")

	_, err := env.call(t, "adena_send", map[string]any{
		"to": "g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5", "amount": "1ugnot",
	})
	if toolErrorCode(err) != "session_required" {
		t.Fatalf("got %v, want session_required", err)
	}
}

func TestRevokeDestroysKeyAfterApproval(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	address := putSession(t, env, "vm/exec")
	key, _ := env.keys.Get(address)

	if _, err := env.call(t, "adena_session_revoke", map[string]any{"session_address": address}); err != nil {
		t.Fatal(err)
	}

	if _, held := env.keys.Get(address); held {
		t.Fatal("key must leave the keyring")
	}

	if _, err := key.Sign([]byte("x")); !errors.Is(err, sessionkey.ErrDestroyed) {
		t.Fatalf("revoked key must not sign, got %v", err)
	}

	if _, err := env.store.Get(address); !errors.Is(err, session.ErrNotFound) {
		t.Fatalf("record must be removed, got %v", err)
	}
}

func TestRevokeKeepsKeyWhenRejected(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	address := putSession(t, env, "vm/exec")
	env.bridge.errs = map[string]error{
		bridge.MethodRevokeSession: &bridge.Error{Code: bridge.CodeRejected, Message: "no"},
	}

	_, err := env.call(t, "adena_session_revoke", map[string]any{"session_address": address})
	if toolErrorCode(err) != "user_rejected" {
		t.Fatalf("got %v", err)
	}

	if _, held := env.keys.Get(address); !held {
		t.Fatal("a still-active session key must be kept")
	}
}

func TestListRefreshMarksMissingSessionsRevoked(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	address := putSession(t, env, "vm/exec")
	env.chain.missing[address] = true

	if _, err := env.call(t, "adena_session_list", map[string]any{"refresh": true}); err != nil {
		t.Fatal(err)
	}

	record, err := env.store.Get(address)
	if err != nil || record.Status != session.StatusRevoked {
		t.Fatalf("got %+v %v", record, err)
	}
}

func TestStatusReportsUnreachableHost(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	env.bridge.errs = map[string]error{
		bridge.MethodGetAccount: &bridge.Error{Code: bridge.CodeHostUnavailable, Message: "down"},
	}

	res, err := env.call(t, "adena_status", nil)
	if err != nil {
		t.Fatal(err)
	}

	if res.StructuredContent["connected"] != false {
		t.Fatalf("got %+v", res.StructuredContent)
	}
}

func TestAllToolsPublish(t *testing.T) {
	t.Parallel()

	registry := server.NewRegistry()
	Register(registry, &Deps{
		Bridge: &fakeBridge{},
		Chain:  &fakeChain{},
		Keys:   sessionkey.NewKeyring(),
		Store:  session.NewStore(t.TempDir()),
	})

	srv := mcp.NewServer(&mcp.Implementation{Name: "t"}, nil)
	if err := registry.Publish(srv, slog.New(slog.DiscardHandler)); err != nil {
		t.Fatal(err)
	}

	if got := len(registry.All()); got != 7 {
		t.Fatalf("got %d tools", got)
	}
}
