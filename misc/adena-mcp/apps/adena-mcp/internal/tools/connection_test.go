package tools

import (
	"testing"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

func TestSessionSigningPausesWhenTheAgentIsDisconnected(t *testing.T) {
	t.Parallel()

	cases := []struct {
		setup func(*testEnv)
		name  string
		want  string
	}{
		{
			name:  "connection turned off or agent removed",
			setup: func(e *testEnv) { e.bridge.status.Connected = false },
			want:  "not_connected",
		},
		{
			name: "Adena not running",
			setup: func(e *testEnv) {
				e.bridge.errs[bridge.MethodGetStatus] = &bridge.Error{Code: bridge.CodeHostUnavailable, Message: "down"}
			},
			want: "adena_unreachable",
		},
	}

	for _, c := range cases {
		for _, tool := range []string{"send_transaction", "sign_transaction"} {
			env := newEnv(t)
			putSession(t, env, "bank/send")
			c.setup(env)

			_, err := env.call(t, tool, map[string]any{"messages": []any{sendMsg()}})
			if toolErrorCode(err) != c.want {
				t.Fatalf("%s, %s: got %v, want %s", c.name, tool, err, c.want)
			}

			if len(env.chain.requests) != 0 {
				t.Fatalf("%s, %s: the session key must not sign", c.name, tool)
			}
		}
	}
}

func TestSessionSigningWorksWhileTheWalletIsLocked(t *testing.T) {
	t.Parallel()

	env := newEnv(t)
	putSession(t, env, "bank/send")
	env.bridge.status.Locked = true

	if _, err := env.call(t, "send_transaction", map[string]any{"messages": []any{sendMsg()}}); err != nil {
		t.Fatal(err)
	}

	if len(env.chain.requests) != 1 {
		t.Fatal("a connected agent signs with its session even while Adena is locked")
	}
}
