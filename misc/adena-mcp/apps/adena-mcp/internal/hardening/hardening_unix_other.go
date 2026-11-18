//go:build unix && !darwin && !linux

package hardening

func denyInspection() error { return nil }
