package hardening

import (
	"testing"

	"golang.org/x/sys/windows"
)

func TestApplyKeepsOtherProcessesFromReadingMemory(t *testing.T) {
	if err := Apply(); err != nil {
		t.Fatal(err)
	}

	pid := windows.GetCurrentProcessId()

	// Opening by pid goes through the DACL, unlike the pseudo handle.
	handle, err := windows.OpenProcess(windows.PROCESS_VM_READ, false, pid)
	if err == nil {
		if closeErr := windows.CloseHandle(handle); closeErr != nil {
			t.Log(closeErr)
		}

		t.Fatal("PROCESS_VM_READ was granted after hardening")
	}

	limited, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
	if err != nil {
		t.Fatalf("limited queries must still work: %v", err)
	}

	if err := windows.CloseHandle(limited); err != nil {
		t.Fatal(err)
	}
}
