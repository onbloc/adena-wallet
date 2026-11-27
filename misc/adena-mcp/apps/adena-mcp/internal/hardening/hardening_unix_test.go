//go:build darwin || linux

package hardening

import (
	"testing"

	"golang.org/x/sys/unix"
)

func TestApplyIsFullAndDisablesCoreDumps(t *testing.T) {
	report := Apply()
	if !report.Full() || report.Err() != nil {
		t.Fatalf("hardening incomplete: %v", report.Problems)
	}

	var limit unix.Rlimit
	if err := unix.Getrlimit(unix.RLIMIT_CORE, &limit); err != nil {
		t.Fatal(err)
	}

	if limit.Cur != 0 || limit.Max != 0 {
		t.Fatalf("core limit %+v, want 0", limit)
	}

	if code, handled := RunProtected(); handled || code != 0 {
		t.Fatal("RunProtected must not relaunch outside Windows")
	}
}

func TestReportJoinsProblems(t *testing.T) {
	var report Report

	report.add(nil)

	if !report.Full() || report.Err() != nil {
		t.Fatal("a nil error is not a problem")
	}

	report.add(unix.EPERM)

	if report.Full() || report.Err() == nil || len(report.Problems) != 1 {
		t.Fatalf("got %+v", report)
	}
}
