//go:build !unix && !windows

package hardening

// Apply is a no-op where the unix hardening calls do not exist.
func Apply() error { return nil }
