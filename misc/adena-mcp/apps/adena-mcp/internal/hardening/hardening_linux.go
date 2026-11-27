package hardening

import (
	"fmt"

	"golang.org/x/sys/unix"
)

// denyInspection clears the dumpable flag, which forbids ptrace attachment and
// /proc/<pid>/mem reads by other processes of the same user.
func denyInspection() error {
	if err := unix.Prctl(unix.PR_SET_DUMPABLE, 0, 0, 0, 0); err != nil {
		return fmt.Errorf("clear dumpable flag: %w", err)
	}

	return nil
}
