package main

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/peercred"
)

// callerExtensionID reads the extension that started the host from the
// browser's arguments: the caller origin for Chromium, the manifest path and
// extension id for Firefox.
func callerExtensionID(args []string) string {
	if len(args) == 0 {
		return ""
	}

	if id, ok := strings.CutPrefix(args[0], "chrome-extension://"); ok {
		return strings.TrimSuffix(id, "/")
	}

	if len(args) >= 2 && !strings.HasPrefix(args[1], "-") {
		return args[1]
	}

	return ""
}

// browserName names the browser that started the host, best effort: the
// executable of the nearest ancestor that is not a shell.
func browserName() string {
	pid := os.Getppid()

	for range 2 {
		exe, err := peercred.Executable(pid)
		if err != nil {
			return ""
		}

		name := strings.TrimSuffix(filepath.Base(exe), filepath.Ext(exe))
		if !isShell(name) {
			return name
		}

		if pid, err = parentOf(pid); err != nil {
			return ""
		}
	}

	return ""
}

func isShell(name string) bool {
	switch strings.ToLower(name) {
	case "cmd", "sh", "bash", "zsh", "dash":
		return true
	}

	return false
}
