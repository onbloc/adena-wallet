package main

import "github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/peercred"

// Chromium starts native hosts through cmd.exe on Windows.
func parentOf(pid int) (int, error) { return peercred.Parent(pid) }
