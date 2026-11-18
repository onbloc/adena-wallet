package relay

import (
	"bufio"
	"os"
	"os/exec"
	"testing"
	"time"

	"golang.org/x/sys/unix"
)

const nonDumpableChildEnv = "ADENA_RELAY_NON_DUMPABLE_CHILD"

// TestMain lets the test binary act as a hardened child process.
func TestMain(m *testing.M) {
	if os.Getenv(nonDumpableChildEnv) == "1" {
		if err := unix.Prctl(unix.PR_SET_DUMPABLE, 0, 0, 0, 0); err != nil {
			os.Exit(2)
		}

		_, _ = os.Stdout.WriteString("ready\n")

		time.Sleep(time.Minute)
		os.Exit(0)
	}

	os.Exit(m.Run())
}

func TestStartTimeIsReadableForANonDumpableProcess(t *testing.T) {
	t.Parallel()

	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}

	child := exec.Command(exe, "-test.run=^$")

	child.Env = append(os.Environ(), nonDumpableChildEnv+"=1")

	out, err := child.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}

	if startErr := child.Start(); startErr != nil {
		t.Fatal(startErr)
	}

	t.Cleanup(func() {
		if killErr := child.Process.Kill(); killErr != nil {
			t.Log(killErr)
		}

		// Wait reports the kill as an error; only reaping matters here.
		if waitErr := child.Wait(); waitErr == nil {
			t.Log("child exited before it was killed")
		}
	})

	if line, readErr := bufio.NewReader(out).ReadString('\n'); readErr != nil || line != "ready\n" {
		t.Fatalf("child not ready: %q %v", line, readErr)
	}

	start, err := startTimeOf(child.Process.Pid)
	if err != nil || start == "" {
		t.Fatalf("start time of a non-dumpable process: %q %v", start, err)
	}

	// The executable is what hardening hides; it is shown only, never trusted.
	if _, err := executableOf(child.Process.Pid); err == nil {
		t.Log("the executable of a non-dumpable process was readable here (privileged runner?)")
	}
}
