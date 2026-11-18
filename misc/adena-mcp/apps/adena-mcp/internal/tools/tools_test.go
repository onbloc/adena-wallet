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
	"github.com/gnolang/gno/tm2/pkg/sdk/bank"
	"github.com/gnolang/gno/tm2/pkg/std"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/chain"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/config"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/sessionkey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

const (
	testMaster    = "g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5"
	testRecipient = "g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj"
	testAgent     = "claude-code"
)

var testNow = time.Unix(1_800_000_000, 0)

type fakeBridge struct {
	token         string
	errs          map[string]error
	params        map[string]json.RawMessage
	sessionResult *bridge.SessionTxResult
	status        bridge.Status
	mu            sync.Mutex
}

func (f *fakeBridge) SetConnectionToken(token string) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.token = token
}

func (f *fakeBridge) Call(_ context.Context, method string, params, out any) error {
	f.mu.Lock()
	defer f.mu.Unlock()

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
	case bridge.MethodGetStatus:
		result = f.status
	case bridge.MethodGetAccount:
		result = bridge.Account{Address: testMaster, ChainID: "dev", RPCURL: "http://rpc"}
	case bridge.MethodConnect:
		result = bridge.Account{Address: testMaster, ChainID: "dev", RPCURL: "http://rpc", ConnectionToken: "secret"}
	case bridge.MethodCreateSession, bridge.MethodRevokeSession:
		result = bridge.SessionTxResult{
			TxHash: "hash", MasterAddress: testMaster, ChainID: "dev", RPCURL: "http://rpc",
			Height: json.RawMessage(`"7"`),
		}
		if f.sessionResult != nil {
			result = *f.sessionResult
		}
	case bridge.MethodSendTransaction:
		result = bridge.BroadcastResult{TxHash: "wallethash", MasterAddress: testMaster, ChainID: "dev"}
	case bridge.MethodSignTransaction:
		result = bridge.SignResult{SignedTx: "c2lnbmVk", SignerAddress: testMaster, ChainID: "dev"}
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
	built    [][]std.Msg
	mu       sync.Mutex
}

func (f *fakeChain) Execute(_ context.Context, req chain.TxRequest) (chain.TxResult, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	master, err := crypto.AddressFromBech32(req.Master)
	if err != nil {
		return chain.TxResult{}, err
	}

	msgs, err := req.Msgs(master)
	if err != nil {
		return chain.TxResult{}, err
	}

	if _, err := req.Signer.Sign([]byte("probe")); err != nil {
		return chain.TxResult{}, err
	}

	f.requests = append(f.requests, req)
	f.built = append(f.built, msgs)

	if req.Mode == chain.SignOnly {
		return chain.TxResult{SignedTx: []byte("signed"), GasWanted: 300_000, GasFee: "300ugnot"}, nil
	}

	return chain.TxResult{TxHash: "txhash", Height: 7, GasWanted: 300_000, GasUsed: 200_000, GasFee: "300ugnot"}, nil
}

func (f *fakeChain) SessionAccount(_ context.Context, _, _, sessionAddress string) (*std.BaseSessionAccount, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.missing[sessionAddress] {
		return nil, chain.ErrSessionNotFound
	}

	return &std.BaseSessionAccount{}, nil
}

type fakeHost struct {
	installs  int
	installed bool
}

func (f *fakeHost) Installed() bool { return f.installed }

func (f *fakeHost) Install() ([]string, error) {
	f.installs++
	f.installed = true

	return []string{"/manifest.json"}, nil
}

type testEnv struct {
	bridge *fakeBridge
	chain  *fakeChain
	host   *fakeHost
	keys   *sessionkey.Keyring
	store  *session.Store
	tools  map[string]*server.Tool
}

func newEnv(t *testing.T) *testEnv {
	t.Helper()

	env := &testEnv{
		bridge: &fakeBridge{
			errs:   map[string]error{},
			params: map[string]json.RawMessage{},
			status: bridge.Status{HasWallet: true, Connected: true},
		},
		chain: &fakeChain{missing: map[string]bool{}},
		host:  &fakeHost{installed: true},
		keys:  sessionkey.NewKeyring(),
		store: session.NewStore(filepath.Join(t.TempDir(), "sessions.json")),
		tools: map[string]*server.Tool{},
	}

	registry := server.NewRegistry()
	Register(registry, &Deps{
		Bridge: env.bridge,
		Chain:  env.chain,
		Host:   env.host,
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

	ctx := server.WithClientName(context.Background(), "Claude Code")

	return tool.Handler(ctx, args)
}

func toolErrorCode(err error) string {
	var te *server.ToolError
	if errors.As(err, &te) {
		return te.Code
	}

	return ""
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
		MasterAddress:  testMaster,
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

func callMsg(pkgPath string) map[string]any {
	return map[string]any{"type": msgCall, "value": map[string]any{"pkg_path": pkgPath, "func": "Incr"}}
}

func sendMsg() map[string]any {
	return map[string]any{"type": msgSend, "value": map[string]any{"to_address": testRecipient, "amount": "5ugnot"}}
}

func TestGetStatusStates(t *testing.T) {
	t.Parallel()

	unreachable := &bridge.Error{Code: bridge.CodeHostUnavailable, Message: "down"}

	cases := []struct {
		setup func(*testEnv)
		want  string
	}{
		{
			func(e *testEnv) { e.host.installed = false; e.bridge.errs[bridge.MethodGetStatus] = unreachable },
			stateHostNotInstalled,
		},
		{func(e *testEnv) { e.bridge.errs[bridge.MethodGetStatus] = unreachable }, stateAdenaUnreachable},
		{func(e *testEnv) { e.bridge.status = bridge.Status{} }, stateNoWallet},
		{func(e *testEnv) { e.bridge.status.Locked = true }, stateLocked},
		{func(e *testEnv) { e.bridge.status.Connected = false }, stateNotConnected},
		{func(*testEnv) {}, stateReady},
	}

	for _, c := range cases {
		env := newEnv(t)
		c.setup(env)

		res, err := env.call(t, "get_status", nil)
		if err != nil {
			t.Fatal(err)
		}

		if res.StructuredContent["state"] != c.want {
			t.Errorf("got state %v, want %s", res.StructuredContent["state"], c.want)
		}

		_, hasStep := res.StructuredContent["next_step"]
		_, hasAccount := res.StructuredContent["account"]

		if (c.want == stateReady) == hasStep || (c.want == stateReady) != hasAccount {
			t.Errorf("%s: next_step=%t account=%t", c.want, hasStep, hasAccount)
		}
	}
}

func TestStatusSendsClientNameAsAgentName(t *testing.T) {
	t.Parallel()

	env := newEnv(t)

	if _, err := env.call(t, "get_status", nil); err != nil {
		t.Fatal(err)
	}

	if got := string(env.bridge.params[bridge.MethodGetStatus]); got != `{"agent_name":"claude-code"}` {
		t.Fatalf("got %s", got)
	}
}

func TestConnectWalletInstallsMissingHost(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	env.host.installed = false
	env.bridge.errs[bridge.MethodGetStatus] = &bridge.Error{Code: bridge.CodeHostUnavailable, Message: "down"}

	res, err := env.call(t, "connect_wallet", nil)
	if err != nil {
		t.Fatal(err)
	}

	if env.host.installs != 1 || res.StructuredContent["state"] != stateAdenaUnreachable {
		t.Fatalf("installs=%d result=%+v", env.host.installs, res.StructuredContent)
	}

	if _, called := env.bridge.params[bridge.MethodConnect]; called {
		t.Fatal("connect must wait until Adena is reachable")
	}
}

func TestConnectWalletAsksAdena(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	env.bridge.status.Connected = false

	res, err := env.call(t, "connect_wallet", nil)
	if err != nil {
		t.Fatal(err)
	}

	if res.StructuredContent["connected"] != true || env.host.installs != 0 {
		t.Fatalf("unexpected %+v", res.StructuredContent)
	}
}

func TestCreateSessionStoresApprovedSession(t *testing.T) {
	t.Parallel()

	env := newEnv(t)

	res, err := env.call(t, "create_session", map[string]any{
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

	if sent.ExpiresAt != testNow.Add(30*time.Minute).Unix() || sent.AgentName != "claude-code" {
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

	records, err := env.store.List()
	if err != nil || len(records) != 1 {
		t.Fatalf("got %+v %v", records, err)
	}

	data, err := json.Marshal(records[0])
	if err != nil {
		t.Fatal(err)
	}

	for _, field := range []string{"password", "private", "mnemonic"} {
		if strings.Contains(string(data), field) {
			t.Fatalf("record contains %q: %s", field, data)
		}
	}
}

func TestCreateSessionDestroysKeyWhenRejected(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	env.bridge.errs[bridge.MethodCreateSession] = &bridge.Error{Code: bridge.CodeRejected, Message: "no"}

	_, err := env.call(t, "create_session", map[string]any{"allow_paths": []any{"bank/send"}})
	if toolErrorCode(err) != "user_rejected" {
		t.Fatalf("got %v, want user_rejected", err)
	}

	records, err := env.store.List()
	if err != nil || len(records) != 0 {
		t.Fatalf("nothing should be stored, got %+v %v", records, err)
	}
}

func TestSendTransactionSignsMultipleMessagesWithSession(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/exec:gno.land/r/other")
	address := putSession(t, env, "vm/exec:gno.land/r/demo", "bank/send")

	res, err := env.call(t, "send_transaction", map[string]any{
		"messages": []any{callMsg("gno.land/r/demo/counter"), sendMsg()},
		"memo":     "hi",
	})
	if err != nil {
		t.Fatal(err)
	}

	req := env.chain.requests[0]
	if req.Signer.Address() != address || req.Mode != chain.Broadcast || req.Memo != "hi" {
		t.Fatalf("unexpected request %+v", req)
	}

	msgs := env.chain.built[0]
	call, isCall := msgs[0].(vm.MsgCall)
	send, isSend := msgs[1].(bank.MsgSend)

	if !isCall || !isSend || call.Caller.String() != testMaster || send.FromAddress.String() != testMaster {
		t.Fatalf("unexpected messages %#v", msgs)
	}

	if res.StructuredContent["signer"] != signerSession || res.StructuredContent["tx_hash"] != "txhash" {
		t.Fatalf("unexpected result %+v", res.StructuredContent)
	}
}

func TestSendTransactionNeedsCoveringSession(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/exec:gno.land/r/demo")

	_, err := env.call(t, "send_transaction", map[string]any{
		"messages": []any{callMsg("gno.land/r/demo_evil"), sendMsg()},
	})

	var te *server.ToolError
	if !errors.As(err, &te) || te.Code != "session_required" {
		t.Fatalf("got %v", err)
	}

	want := []string{"vm/exec:gno.land/r/demo_evil", "bank/send"}
	if got, ok := te.Extra["required_allow_paths"].([]string); !ok || strings.Join(got, ",") != strings.Join(want, ",") {
		t.Fatalf("got %v", te.Extra)
	}
}

func TestSendTransactionRefusesAddPackageWithSession(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "vm/exec")

	_, err := env.call(t, "send_transaction", map[string]any{
		"messages": []any{map[string]any{"type": msgAddPkg, "value": map[string]any{"package": map[string]any{}}}},
	})
	if toolErrorCode(err) != "wallet_signature_required" {
		t.Fatalf("got %v", err)
	}
}

func TestSendTransactionRefusesForeignSigner(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "bank/send")

	msg := sendMsg()
	msg["value"].(map[string]any)["from_address"] = testRecipient

	_, err := env.call(t, "send_transaction", map[string]any{"messages": []any{msg}})
	if toolErrorCode(err) != "invalid_argument" {
		t.Fatalf("got %v", err)
	}
}

func TestSendTransactionWithWallet(t *testing.T) {
	t.Parallel()

	env := newEnv(t)

	addPkg := map[string]any{"type": msgAddPkg, "value": map[string]any{
		"package": map[string]any{"name": "foo", "path": "gno.land/p/demo/foo", "files": []any{}},
	}}

	res, err := env.call(t, "send_transaction", map[string]any{
		"messages": []any{addPkg, sendMsg()},
		"signer":   "wallet",
		"gas_fee":  "2000ugnot",
	})
	if err != nil {
		t.Fatal(err)
	}

	var sent bridge.TransactionParams
	if decodeErr := json.Unmarshal(env.bridge.params[bridge.MethodSendTransaction], &sent); decodeErr != nil {
		t.Fatal(decodeErr)
	}

	if len(sent.Messages) != 2 || sent.GasFee != 2000 || sent.AgentName != "claude-code" {
		t.Fatalf("unexpected params %+v", sent)
	}

	if len(env.chain.requests) != 0 || res.StructuredContent["tx_hash"] != "wallethash" {
		t.Fatalf("wallet signing must not use a session: %+v", res.StructuredContent)
	}
}

func TestSignTransactionWithSession(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "bank/send")

	res, err := env.call(t, "sign_transaction", map[string]any{"messages": []any{sendMsg()}})
	if err != nil {
		t.Fatal(err)
	}

	if env.chain.requests[0].Mode != chain.SignOnly ||
		res.StructuredContent["signed_tx"] != base64.StdEncoding.EncodeToString([]byte("signed")) {
		t.Fatalf("unexpected %+v", res.StructuredContent)
	}
}

func TestWalletRequestsBlockedByUserSetting(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	env.bridge.errs[bridge.MethodSendTransaction] = &bridge.Error{Code: "master_requests_disabled", Message: "off"}

	_, err := env.call(t, "send_transaction", map[string]any{"messages": []any{sendMsg()}, "signer": "wallet"})
	if toolErrorCode(err) != "master_requests_disabled" {
		t.Fatalf("got %v", err)
	}
}

func TestGetStatusReportsMasterRequestSetting(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	env.bridge.status.MasterRequestsAllowed = true

	res, err := env.call(t, "get_status", nil)
	if err != nil {
		t.Fatal(err)
	}

	if res.StructuredContent["master_requests_allowed"] != true {
		t.Fatalf("got %+v", res.StructuredContent)
	}
}

func TestSignTransactionWithWallet(t *testing.T) {
	t.Parallel()

	env := newEnv(t)

	res, err := env.call(t, "sign_transaction", map[string]any{"messages": []any{sendMsg()}, "signer": "wallet"})
	if err != nil {
		t.Fatal(err)
	}

	if res.StructuredContent["signed_tx"] != "c2lnbmVk" {
		t.Fatalf("unexpected %+v", res.StructuredContent)
	}
}

func TestSendTransactionReportsLostKey(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	address := putSession(t, env, "bank/send")
	env.keys.Destroy(address)

	_, err := env.call(t, "send_transaction", map[string]any{"messages": []any{sendMsg()}, "session_address": address})
	if toolErrorCode(err) != "session_key_lost" {
		t.Fatalf("got %v", err)
	}
}

func TestRevokeSessionDestroysKeyAfterApproval(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	address := putSession(t, env, "vm/exec")
	key, _ := env.keys.Get(address)

	if _, err := env.call(t, "revoke_session", map[string]any{"session_address": address}); err != nil {
		t.Fatal(err)
	}

	if _, err := key.Sign([]byte("x")); !errors.Is(err, sessionkey.ErrDestroyed) {
		t.Fatalf("revoked key must not sign, got %v", err)
	}

	if _, err := env.store.Get(address); !errors.Is(err, session.ErrNotFound) {
		t.Fatalf("record must be removed, got %v", err)
	}
}

func TestRevokeSessionKeepsKeyWhenRejected(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	address := putSession(t, env, "vm/exec")
	env.bridge.errs[bridge.MethodRevokeSession] = &bridge.Error{Code: bridge.CodeRejected, Message: "no"}

	_, err := env.call(t, "revoke_session", map[string]any{"session_address": address})
	if toolErrorCode(err) != "user_rejected" {
		t.Fatalf("got %v", err)
	}

	if _, held := env.keys.Get(address); !held {
		t.Fatal("a still-active session key must be kept")
	}
}

func TestGetSessionsRefreshMarksMissingSessionsRevoked(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	address := putSession(t, env, "vm/exec")
	env.chain.missing[address] = true

	if _, err := env.call(t, "get_sessions", map[string]any{"refresh": true}); err != nil {
		t.Fatal(err)
	}

	record, err := env.store.Get(address)
	if err != nil || record.Status != session.StatusRevoked {
		t.Fatalf("got %+v %v", record, err)
	}
}

func TestTxErrorMapsSpendLimit(t *testing.T) {
	t.Parallel()

	err := txError(&chain.SpendError{Outflow: "10ugnot", Limit: "5ugnot", Used: "0ugnot"})
	if toolErrorCode(err) != "session_spend_limit" {
		t.Fatalf("got %v", err)
	}
}

func TestAllToolsPublish(t *testing.T) {
	t.Parallel()

	registry := server.NewRegistry()
	Register(registry, &Deps{
		Bridge: &fakeBridge{},
		Chain:  &fakeChain{},
		Host:   &fakeHost{},
		Keys:   sessionkey.NewKeyring(),
		Store:  session.NewStore(t.TempDir()),
	})

	srv := mcp.NewServer(&mcp.Implementation{Name: "t"}, nil)
	if err := registry.Publish(srv, slog.New(slog.DiscardHandler)); err != nil {
		t.Fatal(err)
	}

	names := make([]string, 0, len(registry.All()))
	for _, tool := range registry.All() {
		names = append(names, tool.Name)
	}

	want := "connect_wallet,create_session,get_sessions,get_status,revoke_session,send_transaction,sign_transaction"
	if strings.Join(names, ",") != want {
		t.Fatalf("got %v", names)
	}
}

func TestGetStatusHidesLockStateUntilConnected(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	env.bridge.status = bridge.Status{HasWallet: true, Locked: true}

	res, err := env.call(t, "get_status", nil)
	if err != nil {
		t.Fatal(err)
	}

	if res.StructuredContent["state"] != stateNotConnected {
		t.Fatalf("got state %v, want %s", res.StructuredContent["state"], stateNotConnected)
	}

	for _, field := range []string{"locked", "master_requests_allowed", "max_spend_limit"} {
		if _, ok := res.StructuredContent[field]; ok {
			t.Errorf("%s reported before the agent is connected", field)
		}
	}
}

func TestCreateSessionDefaultsWithinUserMaximum(t *testing.T) {
	t.Parallel()

	cases := []struct{ maximum, want string }{
		{"", config.DefaultSpendLimit},
		{"1000000ugnot", "1000000ugnot"},
		{"90000000ugnot", config.DefaultSpendLimit},
	}

	for _, c := range cases {
		env := newEnv(t)
		env.bridge.status.MaxSpendLimit = c.maximum

		if _, err := env.call(t, "create_session", map[string]any{"allow_paths": []any{"bank/send"}}); err != nil {
			t.Fatal(err)
		}

		var sent bridge.CreateSessionParams
		if err := json.Unmarshal(env.bridge.params[bridge.MethodCreateSession], &sent); err != nil {
			t.Fatal(err)
		}

		if sent.SpendLimit != c.want {
			t.Errorf("maximum %q: got spend_limit %q, want %q", c.maximum, sent.SpendLimit, c.want)
		}
	}
}

func TestCreateSessionRejectsMalformedSpendLimit(t *testing.T) {
	t.Parallel()

	for _, spendLimit := range []string{"100xugnot", "1ugnot,1foo", "0ugnot", "5foo"} {
		env := newEnv(t)

		_, err := env.call(t, "create_session", map[string]any{
			"allow_paths": []any{"bank/send"},
			"spend_limit": spendLimit,
		})
		if toolErrorCode(err) != "invalid_argument" {
			t.Errorf("%q: got %v, want invalid_argument", spendLimit, err)
		}

		if _, called := env.bridge.params[bridge.MethodCreateSession]; called {
			t.Errorf("%q: reached Adena", spendLimit)
		}
	}
}

func TestCreateSessionRecordsTheAgent(t *testing.T) {
	t.Parallel()

	env := newEnv(t)

	if _, err := env.call(t, "create_session", map[string]any{"allow_paths": []any{"bank/send"}}); err != nil {
		t.Fatal(err)
	}

	records, err := env.store.List()
	if err != nil || len(records) != 1 || records[0].AgentName != testAgent {
		t.Fatalf("got %+v %v", records, err)
	}
}

func TestSessionsOfAnotherAgentAreInvisible(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	address := putSession(t, env, "bank/send")

	record, err := env.store.Get(address)
	if err != nil {
		t.Fatal(err)
	}

	record.AgentName = "cursor"
	if putErr := env.store.Put(record); putErr != nil {
		t.Fatal(putErr)
	}

	_, sendErr := env.call(t, "send_transaction", map[string]any{"messages": []any{sendMsg()}})
	if toolErrorCode(sendErr) != "session_required" {
		t.Fatalf("send: got %v, want session_required", sendErr)
	}

	_, revokeErr := env.call(t, "revoke_session", map[string]any{"session_address": address})
	if toolErrorCode(revokeErr) != "session_unknown" {
		t.Fatalf("revoke: got %v, want session_unknown", revokeErr)
	}

	res, err := env.call(t, "get_sessions", nil)
	if err != nil {
		t.Fatal(err)
	}

	if sessions, _ := res.StructuredContent["sessions"].([]map[string]any); len(sessions) != 0 {
		t.Fatalf("listed another agent's sessions: %+v", sessions)
	}
}

func TestApprovalTimeoutDoesNotSuggestBlindRetry(t *testing.T) {
	t.Parallel()

	for _, err := range []error{context.DeadlineExceeded, &bridge.Error{Code: "approval_timeout", Message: "late"}} {
		var te *server.ToolError
		if !errors.As(bridgeError(err), &te) || te.Code != "approval_timeout" {
			t.Fatalf("got %v", bridgeError(err))
		}

		if strings.Contains(te.Message, "approve and retry") || !strings.Contains(te.Message, "did not go through") {
			t.Fatalf("message %q", te.Message)
		}
	}
}

func TestSessionAdminRequestsCarryTheExpectedContext(t *testing.T) {
	t.Parallel()

	env := newEnv(t)

	if _, err := env.call(t, "create_session", map[string]any{"allow_paths": []any{"bank/send"}}); err != nil {
		t.Fatal(err)
	}

	var created bridge.CreateSessionParams
	if err := json.Unmarshal(env.bridge.params[bridge.MethodCreateSession], &created); err != nil {
		t.Fatal(err)
	}

	if created.MasterAddress != testMaster || created.ChainID != "dev" {
		t.Fatalf("create carries %+v", created)
	}

	address := putSession(t, env, "bank/send")

	record, err := env.store.Get(address)
	if err != nil {
		t.Fatal(err)
	}

	record.ChainID = "other-chain"
	if putErr := env.store.Put(record); putErr != nil {
		t.Fatal(putErr)
	}

	env.bridge.sessionResult = &bridge.SessionTxResult{
		MasterAddress: testMaster, ChainID: "other-chain", Height: json.RawMessage(`12`),
	}

	if _, callErr := env.call(t, "revoke_session", map[string]any{"session_address": address}); callErr != nil {
		t.Fatal(callErr)
	}

	var revoked bridge.RevokeSessionParams
	if decodeErr := json.Unmarshal(env.bridge.params[bridge.MethodRevokeSession], &revoked); decodeErr != nil {
		t.Fatal(decodeErr)
	}

	if revoked.MasterAddress != testMaster || revoked.ChainID != "other-chain" {
		t.Fatalf("revoke carries %+v", revoked)
	}
}

func TestRevokeKeepsKeyOnContextMismatch(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	address := putSession(t, env, "bank/send")
	env.bridge.errs[bridge.MethodRevokeSession] = &bridge.Error{Code: "context_mismatch", Message: "Adena is on chain b"}

	_, err := env.call(t, "revoke_session", map[string]any{"session_address": address})
	if toolErrorCode(err) != "context_mismatch" {
		t.Fatalf("got %v", err)
	}

	if _, held := env.keys.Get(address); !held {
		t.Fatal("the key of a session that was not revoked must be kept")
	}
}

func TestCreateSessionStoresTheNetworkThatAuthorizedIt(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	env.bridge.sessionResult = &bridge.SessionTxResult{
		TxHash: "hash", MasterAddress: testMaster, ChainID: "new-chain", RPCURL: "http://new-rpc",
		Height: json.RawMessage(`"3"`),
	}

	if _, err := env.call(t, "create_session", map[string]any{"allow_paths": []any{"bank/send"}}); err != nil {
		t.Fatal(err)
	}

	records, err := env.store.List()
	if err != nil || len(records) != 1 {
		t.Fatalf("got %+v %v", records, err)
	}

	if records[0].ChainID != "new-chain" || records[0].RPCURL != "http://new-rpc" {
		t.Fatalf("stored %s at %s, want the authorizing network", records[0].ChainID, records[0].RPCURL)
	}
}

func TestRevokeKeepsKeyUnlessConfirmedOnTheSessionNetwork(t *testing.T) {
	t.Parallel()

	cases := map[string]bridge.SessionTxResult{
		"not committed": {MasterAddress: testMaster, ChainID: "dev"},
		"other chain":   {MasterAddress: testMaster, ChainID: "b", Height: json.RawMessage(`5`)},
		"other master":  {MasterAddress: testRecipient, ChainID: "dev", Height: json.RawMessage(`5`)},
	}

	for name, result := range cases {
		env := newEnv(t)
		address := putSession(t, env, "bank/send")
		env.bridge.sessionResult = &result

		_, err := env.call(t, "revoke_session", map[string]any{"session_address": address})
		if toolErrorCode(err) != "revoke_unconfirmed" {
			t.Fatalf("%s: got %v, want revoke_unconfirmed", name, err)
		}

		if _, held := env.keys.Get(address); !held {
			t.Fatalf("%s: the key was destroyed", name)
		}

		if _, err := env.store.Get(address); err != nil {
			t.Fatalf("%s: the record was removed: %v", name, err)
		}
	}
}

func TestConnectWalletKeepsTheTokenAndHidesIt(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	env.bridge.status.Connected = false

	res, err := env.call(t, "connect_wallet", nil)
	if err != nil {
		t.Fatal(err)
	}

	if env.bridge.token != "secret" {
		t.Fatalf("token not kept: %q", env.bridge.token)
	}

	data, err := json.Marshal(res.StructuredContent)
	if err != nil {
		t.Fatal(err)
	}

	if strings.Contains(string(data), "secret") || strings.Contains(res.Text, "secret") {
		t.Fatalf("the token reached the agent: %s %s", data, res.Text)
	}
}

func TestExtensionGoneReportsAnUnknownOutcome(t *testing.T) {
	t.Parallel()

	var te *server.ToolError
	if !errors.As(bridgeError(&bridge.Error{Code: bridge.CodeExtensionGone, Message: "closed"}), &te) {
		t.Fatal("not a tool error")
	}

	if te.Code != bridge.CodeExtensionGone || !strings.Contains(te.Message, "outcome is unknown") {
		t.Fatalf("got %+v", te)
	}
}
