package agentpath

import (
	"os"
	"path/filepath"
	"testing"
)

func TestHomeHonorsEnv(t *testing.T) {
	dir := t.TempDir()
	t.Setenv(HomeEnv, dir)

	got, err := Home()
	if err != nil {
		t.Fatal(err)
	}

	if got != dir {
		t.Fatalf("got %s, want %s", got, dir)
	}
}

func TestEnsureDirTightensPermissions(t *testing.T) {
	t.Parallel()

	dir := filepath.Join(t.TempDir(), "home")
	if err := os.Mkdir(dir, 0o755); err != nil {
		t.Fatal(err)
	}

	if err := EnsureDir(dir); err != nil {
		t.Fatal(err)
	}

	info, err := os.Stat(dir)
	if err != nil {
		t.Fatal(err)
	}

	if info.Mode().Perm() != dirPerm {
		t.Fatalf("got %v, want %v", info.Mode().Perm(), os.FileMode(dirPerm))
	}
}
