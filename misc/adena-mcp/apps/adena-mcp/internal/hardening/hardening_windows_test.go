package hardening

import (
	"testing"
	"unsafe"

	"golang.org/x/sys/windows"
)

func TestApplyGrantsNoMemoryAccessInTheProcessDACL(t *testing.T) {
	if report := Apply(); !report.Full() {
		t.Fatal(report.Err())
	}

	sd, err := windows.GetSecurityInfo(windows.CurrentProcess(), windows.SE_KERNEL_OBJECT,
		windows.DACL_SECURITY_INFORMATION)
	if err != nil {
		t.Fatal(err)
	}

	control, _, err := sd.Control()
	if err != nil {
		t.Fatal(err)
	}

	if control&windows.SE_DACL_PROTECTED == 0 {
		t.Fatal("the process DACL must be protected")
	}

	dacl, _, err := sd.DACL()
	if err != nil || dacl == nil {
		t.Fatalf("no DACL: %v", err)
	}

	for i := range uint32(dacl.AceCount) {
		var ace *windows.ACCESS_ALLOWED_ACE
		if aceErr := windows.GetAce(dacl, i, &ace); aceErr != nil {
			t.Fatal(aceErr)
		}

		if extra := ace.Mask &^ allowedProcessAccess; extra != 0 {
			t.Fatalf("ACE %d grants %#x beyond %#x", i, extra, allowedProcessAccess)
		}
	}

	// The effective check means little when the caller bypasses DACLs.
	if debugPrivilegeEnabled(t) {
		t.Log("SeDebugPrivilege is enabled, which bypasses the DACL; skipping the OpenProcess check")

		return
	}

	handle, err := windows.OpenProcess(windows.PROCESS_VM_READ, false, windows.GetCurrentProcessId())
	if err == nil {
		if closeErr := windows.CloseHandle(handle); closeErr != nil {
			t.Log(closeErr)
		}

		t.Fatal("PROCESS_VM_READ was granted after hardening")
	}
}

func debugPrivilegeEnabled(t *testing.T) bool {
	t.Helper()

	name, err := windows.UTF16PtrFromString("SeDebugPrivilege")
	if err != nil {
		t.Fatal(err)
	}

	var debug windows.LUID
	if err := windows.LookupPrivilegeValue(nil, name, &debug); err != nil {
		t.Fatal(err)
	}

	token := windows.GetCurrentProcessToken()

	var size uint32

	// The first call only reports the size; it fails with ERROR_INSUFFICIENT_BUFFER.
	if err := windows.GetTokenInformation(token, windows.TokenPrivileges, nil, 0, &size); size == 0 {
		t.Fatalf("size token privileges: %v", err)
	}

	buf := make([]byte, size)
	if err := windows.GetTokenInformation(token, windows.TokenPrivileges, &buf[0], size, &size); err != nil {
		t.Fatal(err)
	}

	privileges := (*windows.Tokenprivileges)(unsafe.Pointer(&buf[0]))
	for _, p := range privileges.AllPrivileges() {
		if p.Luid == debug {
			return p.Attributes&windows.SE_PRIVILEGE_ENABLED != 0
		}
	}

	return false
}
