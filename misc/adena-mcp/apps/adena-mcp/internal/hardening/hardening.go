//go:build unix

// Package hardening reduces how a process holding session keys can be
// inspected by other processes of the same user: no core dumps, and no
// debugger or /proc memory access. It cannot stop root or the kernel.
package hardening

import (
	"errors"
	"fmt"

	"golang.org/x/sys/unix"
)

// Apply hardens the current process. Every step is attempted; the joined
// error lists the ones that failed.
func Apply() error {
	var errs []error

	if err := unix.Setrlimit(unix.RLIMIT_CORE, &unix.Rlimit{Cur: 0, Max: 0}); err != nil {
		errs = append(errs, fmt.Errorf("disable core dumps: %w", err))
	}

	if err := denyInspection(); err != nil {
		errs = append(errs, err)
	}

	return errors.Join(errs...)
}
