package tools

import (
	"os"
	"strings"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
)

// allowUnhardenedEnv lets the user accept session keys in a process whose
// hardening is incomplete.
const allowUnhardenedEnv = "ADENA_MCP_ALLOW_UNHARDENED"

const codeKeyProtectionUnavailable = "key_protection_unavailable"

func unhardenedAllowed() bool {
	return os.Getenv(allowUnhardenedEnv) == "1"
}

// requireKeyProtection refuses to create a session key while other programs
// of the user may still read this process's memory.
func (d *Deps) requireKeyProtection() error {
	if d.Protection.Full() || unhardenedAllowed() {
		return nil
	}

	return &server.ToolError{
		Code: codeKeyProtectionUnavailable,
		Message: "this adena-mcp process could not protect session keys from other programs of the user (" +
			strings.Join(d.Protection.Problems, "; ") + "), so it creates no session keys. Restart the MCP " +
			"server. If it persists, the user can accept the risk by setting " + allowUnhardenedEnv +
			"=1 in the MCP server's environment",
		Extra: map[string]any{"key_protection": d.keyProtection()},
	}
}

// keyProtection is the get_status view of the hardening report.
func (d *Deps) keyProtection() map[string]any {
	problems := d.Protection.Problems
	if problems == nil {
		problems = []string{}
	}

	return map[string]any{
		"full":             d.Protection.Full(),
		"problems":         problems,
		"allow_unhardened": unhardenedAllowed(),
	}
}
