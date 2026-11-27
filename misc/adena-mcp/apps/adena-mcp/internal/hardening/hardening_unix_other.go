//go:build unix && !darwin && !linux

package hardening

import (
	"fmt"
	"runtime"
)

func denyInspection() error {
	return fmt.Errorf("debugger and memory access are not restricted on %s", runtime.GOOS)
}
