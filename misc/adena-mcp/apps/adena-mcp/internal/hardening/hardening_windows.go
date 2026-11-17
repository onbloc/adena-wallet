package hardening

import (
	"fmt"

	"golang.org/x/sys/windows"
)

// Rights other processes keep on this one: enough to wait for, inspect the
// name of and stop it, but not to read or write its memory.
const allowedProcessAccess = windows.SYNCHRONIZE | windows.PROCESS_QUERY_LIMITED_INFORMATION |
	windows.PROCESS_TERMINATE

// Apply replaces the process DACL so other processes of the same user cannot
// open it to read memory. The OWNER RIGHTS entry also takes away the implicit
// right of the owner to change the DACL back. Administrators with
// SeDebugPrivilege are not stopped.
func Apply() Report {
	var report Report

	report.add(restrictProcess())

	return report
}

func restrictProcess() error {
	user, err := windows.GetCurrentProcessToken().GetTokenUser()
	if err != nil {
		return fmt.Errorf("read process user: %w", err)
	}

	ownerRights, err := windows.CreateWellKnownSid(windows.WinCreatorOwnerRightsSid)
	if err != nil {
		return fmt.Errorf("owner rights sid: %w", err)
	}

	entries := make([]windows.EXPLICIT_ACCESS, 0, 2)
	for _, sid := range []*windows.SID{user.User.Sid, ownerRights} {
		entries = append(entries, windows.EXPLICIT_ACCESS{
			AccessPermissions: allowedProcessAccess,
			AccessMode:        windows.GRANT_ACCESS,
			Inheritance:       windows.NO_INHERITANCE,
			Trustee: windows.TRUSTEE{
				TrusteeForm:  windows.TRUSTEE_IS_SID,
				TrusteeType:  windows.TRUSTEE_IS_UNKNOWN,
				TrusteeValue: windows.TrusteeValueFromSID(sid),
			},
		})
	}

	acl, err := windows.ACLFromEntries(entries, nil)
	if err != nil {
		return fmt.Errorf("build process dacl: %w", err)
	}

	if err := windows.SetSecurityInfo(windows.CurrentProcess(), windows.SE_KERNEL_OBJECT,
		windows.DACL_SECURITY_INFORMATION|windows.PROTECTED_DACL_SECURITY_INFORMATION,
		nil, nil, acl, nil); err != nil {
		return fmt.Errorf("set process dacl: %w", err)
	}

	return nil
}
