//go:build unix

package hostinstall

import (
	"bytes"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"syscall"
	"testing"

	"golang.org/x/sys/unix"
)

const replaceChildEnv = "ADENA_HOSTINSTALL_REPLACE_CHILD"

// TestMain lets the test binary run replaceFile under a file size limit.
func TestMain(m *testing.M) {
	if path := os.Getenv(replaceChildEnv); path != "" {
		os.Exit(replaceUnderSizeLimit(path))
	}

	os.Exit(m.Run())
}

// replaceUnderSizeLimit makes writes past 64 bytes fail (EFBIG), then tries to
// replace path with a larger file. It exits 0 only if replaceFile reported the
// failure.
func replaceUnderSizeLimit(path string) int {
	signal.Ignore(syscall.SIGXFSZ)

	if err := unix.Setrlimit(unix.RLIMIT_FSIZE, &unix.Rlimit{Cur: 64, Max: 64}); err != nil {
		return 3
	}

	if err := replaceFile(path, bytes.Repeat([]byte("x"), 256), manifestPerm); err == nil {
		return 4
	}

	return 0
}

func TestReplaceFileKeepsTheOldFileWhenWritingFails(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "xyz.onbloc.adena_agent.json")
	original := []byte(`{"name":"xyz.onbloc.adena_agent","path":"/opt/adena/adena-agent-host","type":"stdio"}`)

	if err := os.WriteFile(path, original, 0o444); err != nil {
		t.Fatal(err)
	}

	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}

	child := exec.Command(exe, "-test.run=^$")

	child.Env = append(os.Environ(), replaceChildEnv+"="+path)

	if out, runErr := child.CombinedOutput(); runErr != nil {
		t.Fatalf("child: %v %s", runErr, out)
	}

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	if !bytes.Equal(got, original) {
		t.Fatalf("the manifest was replaced by a failed write: %q", got)
	}

	if leftovers, globErr := filepath.Glob(filepath.Join(dir, "*.tmp")); globErr != nil || len(leftovers) != 0 {
		t.Fatalf("staging left behind: %v %v", leftovers, globErr)
	}
}
