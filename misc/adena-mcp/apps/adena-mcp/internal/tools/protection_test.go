package tools

import (
	"encoding/json"
	"path/filepath"
	"testing"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/config"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/hardening"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/sessionkey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// newProtectionEnv is newEnv with a given hardening report.
func newProtectionEnv(t *testing.T, protection hardening.Report) *testEnv {
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
		Bridge:     env.bridge,
		Chain:      env.chain,
		Host:       env.host,
		Keys:       env.keys,
		Store:      env.store,
		Now:        func() time.Time { return testNow },
		Config:     config.Config{ApprovalTimeout: time.Minute, GasCeiling: 10_000_000},
		Protection: protection,
	})

	for _, tool := range registry.All() {
		env.tools[tool.Name] = tool
	}

	return env
}

var weakProtection = hardening.Report{Problems: []string{"set process dacl: access denied"}}

func TestCreateSessionRefusedWithoutKeyProtection(t *testing.T) {
	t.Setenv(allowUnhardenedEnv, "")

	env := newProtectionEnv(t, weakProtection)

	_, err := env.call(t, "create_session", map[string]any{"allow_paths": []any{"vm/exec:gno.land/r/demo/counter"}})
	if code := toolErrorCode(err); code != codeKeyProtectionUnavailable {
		t.Fatalf("got %v, want %s", err, codeKeyProtectionUnavailable)
	}

	// Refused before Adena is asked anything.
	if _, asked := env.bridge.params[bridge.MethodCreateSession]; asked {
		t.Fatal("create_session reached Adena")
	}

	if _, asked := env.bridge.params[bridge.MethodGetAccount]; asked {
		t.Fatal("get_account reached Adena")
	}
}

func TestCreateSessionAllowedWithOverride(t *testing.T) {
	t.Setenv(allowUnhardenedEnv, "1")

	env := newProtectionEnv(t, weakProtection)

	if _, err := env.call(t, "create_session", map[string]any{
		"allow_paths": []any{"vm/exec:gno.land/r/demo/counter"},
	}); toolErrorCode(err) == codeKeyProtectionUnavailable {
		t.Fatalf("the override did not apply: %v", err)
	}

	if _, asked := env.bridge.params[bridge.MethodCreateSession]; !asked {
		t.Fatal("create_session did not reach Adena")
	}
}

func TestGetStatusReportsKeyProtection(t *testing.T) {
	t.Setenv(allowUnhardenedEnv, "")

	for _, c := range []struct {
		report hardening.Report
		full   bool
	}{
		{hardening.Report{}, true},
		{weakProtection, false},
	} {
		env := newProtectionEnv(t, c.report)
		env.bridge.status.Connected = false

		res, err := env.call(t, "get_status", nil)
		if err != nil {
			t.Fatal(err)
		}

		protection, ok := res.StructuredContent["key_protection"].(map[string]any)
		if !ok {
			t.Fatalf("no key_protection in %v", res.StructuredContent)
		}

		if protection["full"] != c.full {
			t.Errorf("full=%v, want %v", protection["full"], c.full)
		}

		if problems, _ := protection["problems"].([]string); len(problems) != len(c.report.Problems) {
			t.Errorf("problems=%v, want %v", protection["problems"], c.report.Problems)
		}
	}
}
