//go:build !unix

package hardening

import (
	"fmt"
	"runtime"
)

// Apply reports that this platform has no hardening.
func Apply() Report {
	var report Report

	report.add(fmt.Errorf("process hardening is not available on %s", runtime.GOOS))

	return report
}
