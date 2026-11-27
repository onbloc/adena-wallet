package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/peercred"
)

func TestNewerVersion(t *testing.T) {
	t.Parallel()

	cases := []struct {
		release, installed string
		want               bool
	}{
		{"0.2.0", "0.1.9", true},
		{"0.1.10", "0.1.9", true},
		{"1.0.0", "1.0.0-rc.1", true},
		{"0.1.0", "", true},
		{"0.1.0", "0.1.0", false},
		{"0.1.0", "0.2.0", false},
		{"1.0.0-rc.1", "1.0.0", false},
		{"dev", "0.1.0", false},
		{"dev", "", false},
		{"0.2.0", "adena-mcp-v0.1.0-3-gabc", false},
	}

	for _, c := range cases {
		if got := newerVersion(c.release, c.installed); got != c.want {
			t.Errorf("newerVersion(%q, %q) = %v, want %v", c.release, c.installed, got, c.want)
		}
	}
}

func TestVerifyHostAcceptsOnlyTheManagedHost(t *testing.T) {
	t.Parallel()

	agentHome := t.TempDir()
	h := hostInstaller{agentHome: agentHome}

	managed := filepath.Join(agentHome, "bin", hostFileName())
	if err := os.MkdirAll(filepath.Dir(managed), 0o700); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(managed, nil, 0o700); err != nil {
		t.Fatal(err)
	}

	if err := h.VerifyHost(&peercred.Process{PID: 1, Exe: managed}); err != nil {
		t.Fatalf("the managed host must be accepted: %v", err)
	}

	for _, p := range []*peercred.Process{{PID: 2, Exe: "/usr/bin/python3"}, {PID: 3}} {
		if err := h.VerifyHost(p); err == nil {
			t.Fatalf("%+v must be refused", p)
		}
	}
}
