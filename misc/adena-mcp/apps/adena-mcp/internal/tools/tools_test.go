package tools

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/config"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/gnokey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

const testPubKey = "gpub1pgfj7ard9eg82cjtv4u4xetrwqer2dntxyfzxz3pqf4w3gn7lyh333vmh7jaek2gt88tm860" +
	"sl49qdfkn6dqkpqwexs6w7hv9qd"

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

type fakeGnokey struct {
	deleted []string
	txs     []gnokey.TxOptions
	queries []string
	mu      sync.Mutex
}

func (f *fakeGnokey) AddKey(_ context.Context, name, _ string) (gnokey.Key, error) {
	return gnokey.Key{Name: name, Address: "g1session", PubKey: testPubKey}, nil
}

func (f *fakeGnokey) DeleteKey(_ context.Context, name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.deleted = append(f.deleted, name)

	return nil
}

func (f *fakeGnokey) MakeTx(_ context.Context, opts gnokey.TxOptions) (gnokey.TxResult, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.txs = append(f.txs, opts)

	if opts.Simulate {
		return gnokey.TxResult{GasUsed: 200_000}, nil
	}

	return gnokey.TxResult{TxHash: "txhash", Height: 7, GasUsed: 190_000}, nil
}

func (f *fakeGnokey) Query(_ context.Context, _, path string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.queries = append(f.queries, path)

	if path == "auth/gasprice" {
		return `{"gas":1000,"price":"2ugnot"}`, nil
	}

	return "", &gnokey.CommandError{Op: "query", Err: errors.New("exit 1"), Output: "session not found"}
}

type testEnv struct {
	bridge *fakeBridge
	gnokey *fakeGnokey
	store  *session.Store
	tools  map[string]*server.Tool
}

func newEnv(t *testing.T) *testEnv {
	t.Helper()

	env := &testEnv{
		bridge: &fakeBridge{},
		gnokey: &fakeGnokey{},
		store:  session.NewStore(filepath.Join(t.TempDir(), "sessions.json")),
		tools:  map[string]*server.Tool{},
	}

	registry := server.NewRegistry()
	Register(registry, &Deps{
		Bridge: env.bridge,
		Gnokey: env.gnokey,
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

	_, err := env.call(t, "adena_session_create", map[string]any{
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

	if sent.SessionPublicKey != "Amroon75LxjFm7+l3NlIWc69n0+H6lA1Np6aCwQOyaGn" {
		t.Fatalf("unexpected public key %q", sent.SessionPublicKey)
	}

	record, err := env.store.Get("g1session")
	if err != nil {
		t.Fatal(err)
	}

	if record.MasterAddress != "g1master" || record.RPCURL != "http://rpc" || record.Password == "" {
		t.Fatalf("unexpected record %+v", record)
	}
}

func TestSessionCreateDeletesKeyWhenRejected(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	env.bridge.errs = map[string]error{
		bridge.MethodCreateSession: &bridge.Error{Code: bridge.CodeRejected, Message: "no"},
	}

	_, err := env.call(t, "adena_session_create", map[string]any{"allow_paths": []any{"bank/send"}})
	if toolErrorCode(err) != "user_rejected" {
		t.Fatalf("got %v, want user_rejected", err)
	}

	if len(env.gnokey.deleted) != 1 {
		t.Fatalf("the unauthorized key must be deleted, deleted=%v", env.gnokey.deleted)
	}

	records, err := env.store.List()
	if err != nil || len(records) != 0 {
		t.Fatalf("nothing should be stored, got %+v %v", records, err)
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

const testSession = "g1session"

func putSession(t *testing.T, env *testEnv, allowPaths ...string) {
	t.Helper()

	address := testSession

	if err := env.store.Put(session.Record{
		KeyName:        "key-" + address,
		Password:       "pw",
		SessionAddress: address,
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
}

func TestCallMeasuresGasAndSignsWithMaster(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/exec:gno.land/r/demo")

	res, err := env.call(t, "adena_call", map[string]any{
		"pkg_path": "gno.land/r/demo/counter",
		"func":     "Incr",
		"args":     []any{"1"},
	})
	if err != nil {
		t.Fatal(err)
	}

	if len(env.gnokey.txs) != 2 || !env.gnokey.txs[0].Simulate || env.gnokey.txs[1].Simulate {
		t.Fatalf("want a simulation then a broadcast, got %+v", env.gnokey.txs)
	}

	broadcast := env.gnokey.txs[1]
	if broadcast.Master != "g1master" || broadcast.KeyName != "key-g1session" || broadcast.GasWanted != 300_000 {
		t.Fatalf("unexpected broadcast %+v", broadcast)
	}

	// 300000 gas at 2ugnot per 1000 gas.
	if broadcast.GasFee != "600ugnot" {
		t.Fatalf("got fee %s", broadcast.GasFee)
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

	if len(env.gnokey.txs) != 0 {
		t.Fatal("nothing must be signed without a matching session")
	}
}

func TestCallSkipsMeasurementWhenGasGiven(t *testing.T) {
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

	if len(env.gnokey.txs) != 1 || env.gnokey.txs[0].GasFee != "50ugnot" {
		t.Fatalf("got %+v", env.gnokey.txs)
	}
}

func TestSendRequiresBankSend(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/exec")

	_, err := env.call(t, "adena_send", map[string]any{"to": "g1dest", "amount": "1ugnot"})
	if toolErrorCode(err) != "session_required" {
		t.Fatalf("got %v, want session_required", err)
	}
}

func TestRevokeDeletesKeyAfterApproval(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/exec")

	if _, err := env.call(t, "adena_session_revoke", map[string]any{"session_address": "g1session"}); err != nil {
		t.Fatal(err)
	}

	if len(env.gnokey.deleted) != 1 || env.gnokey.deleted[0] != "key-g1session" {
		t.Fatalf("deleted %v", env.gnokey.deleted)
	}

	if _, err := env.store.Get("g1session"); !errors.Is(err, session.ErrNotFound) {
		t.Fatalf("record must be removed, got %v", err)
	}
}

func TestRevokeKeepsKeyWhenRejected(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/exec")
	env.bridge.errs = map[string]error{
		bridge.MethodRevokeSession: &bridge.Error{Code: bridge.CodeRejected, Message: "no"},
	}

	_, err := env.call(t, "adena_session_revoke", map[string]any{"session_address": "g1session"})
	if toolErrorCode(err) != "user_rejected" {
		t.Fatalf("got %v", err)
	}

	if len(env.gnokey.deleted) != 0 {
		t.Fatal("a still-active session key must not be deleted")
	}
}

func TestListRefreshMarksMissingSessionsRevoked(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/exec")

	if _, err := env.call(t, "adena_session_list", map[string]any{"refresh": true}); err != nil {
		t.Fatal(err)
	}

	record, err := env.store.Get("g1session")
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

func TestFeeFor(t *testing.T) {
	t.Parallel()

	if got := feeFor(1_000_001, floorPrice); got != "1001ugnot" {
		t.Fatalf("fee must round up, got %s", got)
	}
}

func TestAllToolsPublish(t *testing.T) {
	t.Parallel()

	registry := server.NewRegistry()
	Register(registry, &Deps{Bridge: &fakeBridge{}, Gnokey: &fakeGnokey{}, Store: session.NewStore(t.TempDir())})

	srv := mcp.NewServer(&mcp.Implementation{Name: "t"}, nil)
	if err := registry.Publish(srv, slog.New(slog.DiscardHandler)); err != nil {
		t.Fatal(err)
	}

	if got := len(registry.All()); got != 7 {
		t.Fatalf("got %d tools", got)
	}
}
