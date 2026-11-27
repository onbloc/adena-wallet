//go:build !windows

package relay

import (
	"fmt"
	"os"
)

func restrictSocket(path string) error {
	if err := os.Chmod(path, socketPerm); err != nil {
		return fmt.Errorf("chmod socket: %w", err)
	}

	return nil
}
