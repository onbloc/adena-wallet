//go:build unix

package session

import (
	"errors"
	"os"

	"golang.org/x/sys/unix"
)

const lockPerm = 0o600

// lockFile blocks until it holds an exclusive flock on path.
func lockFile(path string) (func(), error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, lockPerm)
	if err != nil {
		return nil, err
	}

	for {
		err = unix.Flock(int(f.Fd()), unix.LOCK_EX)
		if !errors.Is(err, unix.EINTR) {
			break
		}
	}

	if err != nil {
		_ = f.Close()

		return nil, err
	}

	return func() {
		// Closing the file releases the lock as well.
		_ = f.Close()
	}, nil
}
