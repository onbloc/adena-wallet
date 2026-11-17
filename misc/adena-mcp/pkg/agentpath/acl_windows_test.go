package agentpath

import (
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
