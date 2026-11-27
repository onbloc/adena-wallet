//go:build unix

package agentpath

import (
	"errors"
	"os"
	"syscall"
)

// IsOwnedByUser reports whether path, not followed if it is a link, belongs
// to the current user. A socket left by another user must not be trusted
// even inside an owner-only directory.
func IsOwnedByUser(path string) (bool, error) {
	info, err := os.Lstat(path)
	if err != nil {
		return false, err
	}

	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		return false, errors.New("no owner information for " + path)
	}

	return int(stat.Uid) == os.Getuid(), nil
}

// dirOwnedByUser reports whether a directory from os.Stat belongs to the
// current user.
func dirOwnedByUser(info os.FileInfo) bool {
	stat, ok := info.Sys().(*syscall.Stat_t)

	return ok && int(stat.Uid) == os.Getuid()
}
