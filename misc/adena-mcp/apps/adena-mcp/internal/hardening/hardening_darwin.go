package hardening

import (
	"fmt"

	"golang.org/x/sys/unix"
)

// denyInspection refuses debugger attachment (PT_DENY_ATTACH), which also
// blocks task_for_pid based memory readers that go through the debugger path.
func denyInspection() error {
	if err := unix.PtraceDenyAttach(); err != nil {
		return fmt.Errorf("deny debugger attach: %w", err)
	}

	return nil
}
