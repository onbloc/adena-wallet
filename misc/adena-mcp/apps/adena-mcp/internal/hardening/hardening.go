//go:build unix

// Package hardening reduces how a process holding session keys can be
// inspected by other processes of the same user: no core dumps, and no
// debugger or /proc memory access. It cannot stop root or the kernel.
package hardening

import (
	"fmt"

	"golang.org/x/sys/unix"
)

// Apply hardens the current process. Every step is attempted; the report
// lists the ones that failed.
func Apply() Report {
	var report Report

	if err := unix.Setrlimit(unix.RLIMIT_CORE, &unix.Rlimit{Cur: 0, Max: 0}); err != nil {
		report.add(fmt.Errorf("disable core dumps: %w", err))
	}

	report.add(denyInspection())

	return report
}
