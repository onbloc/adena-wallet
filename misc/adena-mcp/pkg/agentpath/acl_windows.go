package agentpath

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"golang.org/x/sys/windows"
)

// restrictDir gives dir a protected DACL that grants full control to the
// current user and SYSTEM only, inherited by everything below it, such as the
// socket and sessions.json.
func restrictDir(dir string) error {
	if err := refuseReparsePoint(dir); err != nil {
		return err
	}

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

	return removeUntrusted(dir, user.User.Sid)
}

// refuseReparsePoint keeps a junction or symbolic link from redirecting a
// directory the browser runs the host from.
func refuseReparsePoint(path string) error {
	name, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return err
	}

	attributes, err := windows.GetFileAttributes(name)
	if err != nil {
		return fmt.Errorf("read attributes of %s: %w", path, err)
	}

	if attributes&windows.FILE_ATTRIBUTE_REPARSE_POINT != 0 {
		return fmt.Errorf("%s is a link or junction; remove it or choose another %s", path, HomeEnv)
	}

	return nil
}

// removeUntrusted deletes whatever below dir another account owns. Taking over
// dir does not take over what is inside: an owner keeps rewriting rights on
// its own files and directories, and Windows lets it reach them by path even
// through a directory it can no longer list. Everything in the agent home is
// recreated by adena-mcp or the installer, so removing it is safe.
func removeUntrusted(dir string, user *windows.SID) error {
	return filepath.WalkDir(dir, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}

		if path == dir {
			return nil
		}

		trusted, err := hasTrustedOwner(path, user)
		if err != nil {
			return err
		}

		if trusted {
			return nil
		}

		if err := os.RemoveAll(path); err != nil {
			return fmt.Errorf("%s is owned by another account and cannot be removed: %w", path, err)
		}

		if entry.IsDir() {
			return filepath.SkipDir
		}

		return nil
	})
}

// hasTrustedOwner reports whether path belongs to user, SYSTEM or the
// Administrators group, which elevated processes create objects for.
func hasTrustedOwner(path string, user *windows.SID) (bool, error) {
	owner, err := ownerOf(path)
	if err != nil {
		return false, err
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

// ownerOf reads the owner through a handle opened on the entry itself, so
// links and AF_UNIX socket files, which are reparse points, are not followed.
func ownerOf(path string) (*windows.SID, error) {
	name, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return nil, err
	}

	handle, err := windows.CreateFile(name, windows.READ_CONTROL,
		windows.FILE_SHARE_READ|windows.FILE_SHARE_WRITE|windows.FILE_SHARE_DELETE, nil, windows.OPEN_EXISTING,
		windows.FILE_FLAG_OPEN_REPARSE_POINT|windows.FILE_FLAG_BACKUP_SEMANTICS, 0)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}

	defer windows.CloseHandle(handle) //nolint:errcheck // nothing to do if closing a query handle fails

	sd, err := windows.GetSecurityInfo(handle, windows.SE_FILE_OBJECT, windows.OWNER_SECURITY_INFORMATION)
	if err != nil {
		return nil, fmt.Errorf("read owner of %s: %w", path, err)
	}

	owner, _, err := sd.Owner()
	if err != nil {
		return nil, fmt.Errorf("read owner of %s: %w", path, err)
	}

	return owner, nil
}
