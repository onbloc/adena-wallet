package agentpath

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"golang.org/x/sys/windows"
)

func TestEnsureDirProtectsTheDACL(t *testing.T) {
	t.Parallel()

	dir := filepath.Join(t.TempDir(), "agent")
	if err := EnsureDir(dir); err != nil {
		t.Fatal(err)
	}

	sd, err := windows.GetNamedSecurityInfo(dir, windows.SE_FILE_OBJECT, windows.DACL_SECURITY_INFORMATION)
	if err != nil {
		t.Fatal(err)
	}

	control, _, err := sd.Control()
	if err != nil {
		t.Fatal(err)
	}

	if control&windows.SE_DACL_PROTECTED == 0 {
		t.Fatal("the agent home must not inherit the parent's ACL")
	}
}

func TestEnsureDirLeavesTheDirectoryOwnedByTheUser(t *testing.T) {
	t.Parallel()

	dir := filepath.Join(t.TempDir(), "agent")
	if err := EnsureDir(dir); err != nil {
		t.Fatal(err)
	}

	user, err := windows.GetCurrentProcessToken().GetTokenUser()
	if err != nil {
		t.Fatal(err)
	}

	trusted, err := hasTrustedOwner(dir, user.User.Sid)
	if err != nil || !trusted {
		t.Fatalf("owner not trusted: %v", err)
	}
}

func TestEnsureDirRemovesEntriesAnotherAccountOwns(t *testing.T) {
	enableRestorePrivilege(t)

	dir := filepath.Join(t.TempDir(), "agent")
	planted := filepath.Join(dir, "native-messaging", "chrome")

	if err := os.MkdirAll(planted, 0o700); err != nil {
		t.Fatal(err)
	}

	manifest := filepath.Join(planted, "xyz.onbloc.adena_agent.json")
	if err := os.WriteFile(manifest, []byte(`{"path":"C:\\evil.exe"}`), 0o600); err != nil {
		t.Fatal(err)
	}

	kept := filepath.Join(dir, "kept")
	if err := os.WriteFile(kept, nil, 0o600); err != nil {
		t.Fatal(err)
	}

	// BUILTIN\Users stands in for another account: it is not a trusted owner.
	users, err := windows.CreateWellKnownSid(windows.WinBuiltinUsersSid)
	if err != nil {
		t.Fatal(err)
	}

	if setErr := windows.SetNamedSecurityInfo(manifest, windows.SE_FILE_OBJECT,
		windows.OWNER_SECURITY_INFORMATION, users, nil, nil, nil); setErr != nil {
		t.Skipf("cannot assign another owner here: %v", setErr)
	}

	if err := EnsureDir(dir); err != nil {
		t.Fatal(err)
	}

	if _, err := os.Lstat(manifest); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("the foreign-owned manifest is still there: %v", err)
	}

	if _, err := os.Lstat(kept); err != nil {
		t.Fatalf("an own file was removed: %v", err)
	}
}

func enableRestorePrivilege(t *testing.T) {
	t.Helper()

	name, err := windows.UTF16PtrFromString("SeRestorePrivilege")
	if err != nil {
		t.Fatal(err)
	}

	var luid windows.LUID
	if err := windows.LookupPrivilegeValue(nil, name, &luid); err != nil {
		t.Skipf("lookup SeRestorePrivilege: %v", err)
	}

	var token windows.Token
	if err := windows.OpenProcessToken(windows.CurrentProcess(),
		windows.TOKEN_ADJUST_PRIVILEGES|windows.TOKEN_QUERY, &token); err != nil {
		t.Skipf("open token: %v", err)
	}

	defer func() { _ = token.Close() }()

	privileges := windows.Tokenprivileges{PrivilegeCount: 1}
	privileges.Privileges[0] = windows.LUIDAndAttributes{Luid: luid, Attributes: windows.SE_PRIVILEGE_ENABLED}

	if err := windows.AdjustTokenPrivileges(token, false, &privileges, 0, nil, nil); err != nil {
		t.Skipf("enable SeRestorePrivilege: %v", err)
	}
}
