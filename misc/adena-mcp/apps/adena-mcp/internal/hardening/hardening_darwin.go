package hardening

import (
	"fmt"

	"golang.org/x/sys/unix"
)

// denyInspection refuses ptrace attachment (PT_DENY_ATTACH). It does not stop
// task_for_pid; release binaries are signed with the hardened runtime for that.
func denyInspection() error {
	if err := unix.PtraceDenyAttach(); err != nil {
		return fmt.Errorf("deny debugger attach: %w", err)
	}

	return nil
}
