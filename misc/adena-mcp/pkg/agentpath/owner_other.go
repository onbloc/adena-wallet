//go:build !unix && !windows

package agentpath

import "os"

// IsOwnedByUser cannot read owners here and only checks that path exists.
func IsOwnedByUser(path string) (bool, error) {
	if _, err := os.Lstat(path); err != nil {
		return false, err
	}

	return true, nil
}

// dirOwnedByUser cannot read owners here.
func dirOwnedByUser(os.FileInfo) bool { return true }
