package agentpath

import (
	"fmt"

	"golang.org/x/sys/windows"
)

// restrictDir gives dir a protected DACL that grants full control to the
// current user and SYSTEM only, inherited by everything below it, such as the
// socket and sessions.json.
func restrictDir(dir string) error {
	user, err := windows.GetCurrentProcessToken().GetTokenUser()
	if err != nil {
		return fmt.Errorf("read process user: %w", err)
	}

	system, err := windows.CreateWellKnownSid(windows.WinLocalSystemSid)
	if err != nil {
		return fmt.Errorf("system sid: %w", err)
	}

	entries := make([]windows.EXPLICIT_ACCESS, 0, 2)
	for _, sid := range []*windows.SID{user.User.Sid, system} {
		entries = append(entries, windows.EXPLICIT_ACCESS{
			AccessPermissions: windows.GENERIC_ALL,
			AccessMode:        windows.GRANT_ACCESS,
			Inheritance:       windows.SUB_CONTAINERS_AND_OBJECTS_INHERIT,
			Trustee: windows.TRUSTEE{
				TrusteeForm:  windows.TRUSTEE_IS_SID,
				TrusteeType:  windows.TRUSTEE_IS_UNKNOWN,
				TrusteeValue: windows.TrusteeValueFromSID(sid),
			},
		})
	}

	acl, err := windows.ACLFromEntries(entries, nil)
	if err != nil {
		return fmt.Errorf("build dacl for %s: %w", dir, err)
	}

	// An owner keeps the implicit right to rewrite the DACL, so a directory
	// owned by another account is taken over before it is trusted.
	info := windows.SECURITY_INFORMATION(windows.DACL_SECURITY_INFORMATION | windows.PROTECTED_DACL_SECURITY_INFORMATION)

	var owner *windows.SID

	trusted, err := hasTrustedOwner(dir, user.User.Sid)
	if err != nil {
		return err
	}

	if !trusted {
		info |= windows.OWNER_SECURITY_INFORMATION
		owner = user.User.Sid
	}

	if setErr := windows.SetNamedSecurityInfo(dir, windows.SE_FILE_OBJECT, info, owner, nil, acl, nil); setErr != nil {
		return fmt.Errorf("restrict %s: %w", dir, setErr)
	}

	if trusted, err = hasTrustedOwner(dir, user.User.Sid); err != nil {
		return err
	}

	if !trusted {
		return fmt.Errorf("%s is owned by another account; remove it or choose another ADENA_AGENT_HOME", dir)
	}

	return nil
}

// hasTrustedOwner reports whether dir belongs to user, SYSTEM or the
// Administrators group, which elevated processes create objects for.
func hasTrustedOwner(dir string, user *windows.SID) (bool, error) {
	sd, err := windows.GetNamedSecurityInfo(dir, windows.SE_FILE_OBJECT, windows.OWNER_SECURITY_INFORMATION)
	if err != nil {
		return false, fmt.Errorf("read owner of %s: %w", dir, err)
	}

	owner, _, err := sd.Owner()
	if err != nil {
		return false, fmt.Errorf("read owner of %s: %w", dir, err)
	}

	if owner.Equals(user) {
		return true, nil
	}

	for _, known := range []windows.WELL_KNOWN_SID_TYPE{windows.WinLocalSystemSid, windows.WinBuiltinAdministratorsSid} {
		sid, sidErr := windows.CreateWellKnownSid(known)
		if sidErr != nil {
			return false, fmt.Errorf("well-known sid: %w", sidErr)
		}

		if owner.Equals(sid) {
			return true, nil
		}
	}

	return false, nil
}
