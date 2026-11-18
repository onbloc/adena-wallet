//go:build !unix

package agentpath

import "os"

// IsOwnedByUser cannot read owners here and only checks that path exists.
func IsOwnedByUser(path string) (bool, error) {
	if _, err := os.Lstat(path); err != nil {
		return false, err
	}

	return true, nil
}
