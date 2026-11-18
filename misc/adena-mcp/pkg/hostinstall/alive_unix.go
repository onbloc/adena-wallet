//go:build unix

package hostinstall

import (
	"errors"

	"golang.org/x/sys/unix"
)

// processAlive reports whether pid names a running process.
func processAlive(pid int) bool {
	err := unix.Kill(pid, 0)

	return err == nil || errors.Is(err, unix.EPERM)
}
