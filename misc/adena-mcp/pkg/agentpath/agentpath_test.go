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

func TestHostHomePrefersEnvThenMarkerThenDefault(t *testing.T) {
	bin := t.TempDir()
	executable := filepath.Join(bin, "adena-agent-host")
	custom := filepath.Join(t.TempDir(), "custom-home")

	t.Setenv(HomeEnv, "")

	fallback, err := Home()
	if err != nil {
		t.Fatal(err)
	}

	if got, err := HostHome(executable); err != nil || got != fallback {
		t.Fatalf("without a marker got %q, want %q", got, fallback)
	}

	if err := WriteHomeMarker(bin, custom); err != nil {
		t.Fatal(err)
	}

	if got, err := HostHome(executable); err != nil || got != custom {
		t.Fatalf("with a marker got %q, want %q", got, custom)
	}

	override := filepath.Join(t.TempDir(), "override")
	t.Setenv(HomeEnv, override)

	if got, err := HostHome(executable); err != nil || got != override {
		t.Fatalf("with the env got %q, want %q", got, override)
	}
}

func TestHostHomeIgnoresARelativeMarker(t *testing.T) {
	bin := t.TempDir()
	t.Setenv(HomeEnv, "")

	if err := os.WriteFile(filepath.Join(bin, HomeMarker), []byte("relative/home\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	fallback, err := Home()
	if err != nil {
		t.Fatal(err)
	}

	if got, hostErr := HostHome(filepath.Join(bin, "adena-agent-host")); hostErr != nil || got != fallback {
		t.Fatalf("got %q, want %q", got, fallback)
	}
}
