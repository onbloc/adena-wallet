package hardening

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"
	"testing"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	// helperEnv makes the test binary act as the protected server.
	helperEnv      = "ADENA_HARDENING_TEST_HELPER"
	helperExitCode = 7
)

func TestMain(m *testing.M) {
	if os.Getenv(helperEnv) == "1" {
		os.Exit(runHelper())
	}

	os.Exit(m.Run())
}

// runHelper stands in for the server: it hardens itself like main does, keeps
// several runtime threads busy, reports its report and exits once stdin closes.
func runHelper() int {
	if _, handled := RunProtected(); handled {
		return 99 // the helper must already be the protected child
	}

	report := Apply()

	var workers sync.WaitGroup

	stop := make(chan struct{})

	for range 4 {
		workers.Go(func() {
			for {
				select {
				case <-stop:
					return
				case <-time.After(time.Millisecond):
				}
			}
		})
	}

	fmt.Printf("ready full=%t %s\n", report.Full(), strings.Join(report.Problems, " | "))

	if _, err := io.Copy(io.Discard, os.Stdin); err != nil {
		return 98
	}

	close(stop)
	workers.Wait()

	return helperExitCode
}

func TestApplyGrantsNoMemoryAccessInTheProcessDACL(t *testing.T) {
	report := Apply()

	// The test process was not started protected; the report must say so.
	if report.Full() {
		t.Fatal("Apply reported full protection for a process RunProtected did not start")
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

	if aclErr := grantsAtMost(dacl, allowedProcessAccess); aclErr != nil {
		t.Fatal(aclErr)
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

func TestProtectedChildDeniesMemoryAndThreadAccess(t *testing.T) {
	if debugPrivilegeEnabled(t) {
		t.Skip("SeDebugPrivilege is enabled, which bypasses the DACLs under test")
	}

	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}

	stdinR, stdinW, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}

	stdoutR, stdoutW, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command(exe, "-test.run=^$")
	cmd.Stdin, cmd.Stdout, cmd.Stderr = stdinR, stdoutW, os.Stderr
	cmd.Env = append(os.Environ(), helperEnv+"=1", childEnv+"=1")

	child, err := startProtected(cmd)
	if err != nil {
		t.Fatal(err)
	}

	_ = stdinR.Close()
	_ = stdoutW.Close()

	exited := false

	defer func() {
		if !exited {
			_ = stdinW.Close()

			if _, waitErr := child.wait(); waitErr != nil {
				t.Log(waitErr)
			}
		}
	}()

	line, err := readLine(stdoutR, 30*time.Second)
	if err != nil {
		t.Fatal(err)
	}

	if !strings.HasPrefix(line, "ready full=true") {
		t.Fatalf("the protected child reported %q", line)
	}

	denied := []uint32{
		windows.PROCESS_VM_READ,
		windows.PROCESS_VM_WRITE,
		windows.PROCESS_DUP_HANDLE,
		windows.PROCESS_CREATE_THREAD,
		windows.PROCESS_SUSPEND_RESUME,
		windows.WRITE_DAC,
	}

	for _, access := range denied {
		requireDenied(t, fmt.Sprintf("process access %#x", access), func() (windows.Handle, error) {
			return windows.OpenProcess(access, false, uint32(child.pid))
		})
	}

	threads, err := threadsOf(uint32(child.pid))
	if err != nil {
		t.Fatal(err)
	}

	if len(threads) < 2 {
		t.Fatalf("found %d threads in the child; expected the runtime's threads", len(threads))
	}

	for _, tid := range threads {
		requireDenied(t, fmt.Sprintf("thread %d", tid), func() (windows.Handle, error) {
			return windows.OpenThread(windows.THREAD_SET_CONTEXT|windows.THREAD_GET_CONTEXT, false, tid)
		})
	}

	_ = stdinW.Close()

	code, err := child.wait()
	exited = true

	if err != nil {
		t.Fatal(err)
	}

	if code != helperExitCode {
		t.Fatalf("exit code %d, want %d", code, helperExitCode)
	}
}

func requireDenied(t *testing.T, what string, open func() (windows.Handle, error)) {
	t.Helper()

	handle, err := open()
	if err == nil {
		if closeErr := windows.CloseHandle(handle); closeErr != nil {
			t.Log(closeErr)
		}

		t.Fatalf("%s was granted to another process of the user", what)
	}

	// A thread that exited meanwhile reports ERROR_INVALID_PARAMETER.
	if !errors.Is(err, windows.ERROR_ACCESS_DENIED) && !errors.Is(err, windows.ERROR_INVALID_PARAMETER) {
		t.Fatalf("%s: unexpected error %v", what, err)
	}
}

func readLine(r io.Reader, timeout time.Duration) (string, error) {
	lines := make(chan string, 1)
	errs := make(chan error, 1)

	go func() {
		line, err := bufio.NewReader(r).ReadString('\n')
		if err != nil {
			errs <- err

			return
		}

		lines <- strings.TrimSpace(line)
	}()

	select {
	case line := <-lines:
		return line, nil
	case err := <-errs:
		return "", fmt.Errorf("read from the child: %w", err)
	case <-time.After(timeout):
		return "", errors.New("the child did not report in time")
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
