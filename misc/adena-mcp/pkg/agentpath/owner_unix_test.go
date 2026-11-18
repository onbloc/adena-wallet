//go:build unix

package agentpath

import (
	"os"
	"syscall"
)

// foreignDir reports the same directory as owned by another uid.
type foreignDir struct{ os.FileInfo }

func (f foreignDir) Sys() any {
	stat := *f.FileInfo.Sys().(*syscall.Stat_t) //nolint:forcetypeassert // unix only

	stat.Uid++

	return &stat
}
