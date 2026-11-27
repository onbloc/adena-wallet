package session

import (
	"os"

	"golang.org/x/sys/windows"
)

const lockPerm = 0o600

// lockFile blocks until it holds an exclusive lock on path.
func lockFile(path string) (func(), error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, lockPerm)
	if err != nil {
		return nil, err
	}

	handle := windows.Handle(f.Fd())
	if err := windows.LockFileEx(handle, windows.LOCKFILE_EXCLUSIVE_LOCK, 0, 1, 0, new(windows.Overlapped)); err != nil {
		_ = f.Close()

		return nil, err
	}

	// Closing the file releases the lock.
	return func() { _ = f.Close() }, nil
}
