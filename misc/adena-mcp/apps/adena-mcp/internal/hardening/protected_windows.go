package hardening

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

// childEnv marks the server process RunProtected started.
const childEnv = "ADENA_MCP_PROTECTED_CHILD"

// limitedHandleAccess is all this process keeps on the server it started.
const limitedHandleAccess = windows.SYNCHRONIZE | windows.PROCESS_QUERY_LIMITED_INFORMATION

// launch records how this process started, for Apply's report.
var launch struct {
	problem error
	child   bool
}

// RunProtected runs the server in a child process created with protected
// security descriptors and returns its exit code with handled set. The
// process that started this one (the npm launcher) holds a full-access handle
// to it, and a DACL set after start cannot take that back; the child is never
// exposed that way. It returns handled false in the child itself, or when the
// child could not be started, in which case Apply reports the problem.
func RunProtected() (int, bool) {
	if os.Getenv(childEnv) == "1" {
		_ = os.Unsetenv(childEnv)
		launch.child = true

		return 0, false
	}

	exe, err := os.Executable()
	if err != nil {
		launch.problem = fmt.Errorf("protected relaunch: resolve executable: %w", err)

		return 0, false
	}

	cmd := exec.Command(exe, os.Args[1:]...)
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	cmd.Env = append(os.Environ(), childEnv+"=1")

	child, err := startProtected(cmd)
	if err != nil {
		launch.problem = fmt.Errorf("protected relaunch: %w", err)

		return 0, false
	}

	// The child shares the console and handles interrupts itself.
	signal.Ignore(os.Interrupt)

	code, err := child.wait()
	if err != nil {
		fmt.Fprintln(os.Stderr, "adena-mcp: wait for the protected server:", err)

		return 1, true
	}

	return code, true
}

type protectedChild struct {
	pid    int
	handle windows.Handle // limitedHandleAccess only
}

// startProtected starts cmd with protected process and thread descriptors and
// a restricted token default DACL, then trades the full-access handle
// CreateProcess returns for a limited one.
func startProtected(cmd *exec.Cmd) (*protectedChild, error) {
	user, err := currentUser()
	if err != nil {
		return nil, err
	}

	// The child's token is a copy of this one, so its runtime threads and
	// other objects get this default too.
	if dacErr := restrictDefaultDACL(user); dacErr != nil {
		return nil, dacErr
	}

	processSD, err := protectedDescriptor(user, allowedProcessAccess)
	if err != nil {
		return nil, err
	}

	threadSD, err := protectedDescriptor(user, allowedThreadAccess)
	if err != nil {
		return nil, err
	}

	cmd.SysProcAttr = &syscall.SysProcAttr{
		ProcessAttributes: securityAttributes(processSD),
		ThreadAttributes:  securityAttributes(threadSD),
	}

	// Entered before the start, so the child starts inside the job and dies
	// with this process instead of being orphaned.
	enterKillOnCloseJob()

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start server: %w", err)
	}

	runtime.KeepAlive(processSD)
	runtime.KeepAlive(threadSD)

	child := &protectedChild{pid: cmd.Process.Pid}

	var dupErr error

	handleErr := cmd.Process.WithHandle(func(full uintptr) {
		dupErr = windows.DuplicateHandle(windows.CurrentProcess(), windows.Handle(full), windows.CurrentProcess(),
			&child.handle, limitedHandleAccess, false, 0)
	})
	if err := errors.Join(handleErr, dupErr); err != nil {
		// The child must not run while a full handle to it may remain.
		killErr := cmd.Process.Kill()
		_ = cmd.Wait() //nolint:errcheck // the child was just killed; its exit status means nothing

		return nil, fmt.Errorf("take a limited handle to the server: %w", errors.Join(err, killErr))
	}

	// Closes the full-access handle right away. Release only fails when the
	// handle is already released, and the child is running either way.
	_ = cmd.Process.Release() //nolint:errcheck // see above

	return child, nil
}

func (c *protectedChild) wait() (int, error) {
	defer closeHandle(c.handle)

	if _, err := windows.WaitForSingleObject(c.handle, windows.INFINITE); err != nil {
		return 0, err
	}

	var code uint32
	if err := windows.GetExitCodeProcess(c.handle, &code); err != nil {
		return 0, err
	}

	return int(code), nil
}

// enterKillOnCloseJob puts this process in a new job that kills its members
// when its only handle closes, which happens when this process exits; the
// handle is never closed earlier, since that would kill this process too.
// Best effort: an enclosing job may forbid it.
func enterKillOnCloseJob() {
	job, err := windows.CreateJobObject(nil, nil)
	if err != nil {
		return
	}

	var info windows.JOBOBJECT_EXTENDED_LIMIT_INFORMATION
	info.BasicLimitInformation.LimitFlags = windows.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE

	if _, err := windows.SetInformationJobObject(job, windows.JobObjectExtendedLimitInformation,
		uintptr(unsafe.Pointer(&info)), uint32(unsafe.Sizeof(info))); err != nil {
		closeHandle(job)

		return
	}

	// Not yet a member, so closing the handle on failure is safe.
	if err := windows.AssignProcessToJobObject(job, windows.CurrentProcess()); err != nil {
		closeHandle(job)
	}
}

// protectedDescriptor returns a self-relative descriptor whose protected DACL
// grants the user and OWNER RIGHTS only access.
func protectedDescriptor(user *windows.SID, access windows.ACCESS_MASK) (*windows.SECURITY_DESCRIPTOR, error) {
	acl, err := limitedACL(user, access, false)
	if err != nil {
		return nil, err
	}

	sd, err := windows.NewSecurityDescriptor()
	if err != nil {
		return nil, fmt.Errorf("security descriptor: %w", err)
	}

	if daclErr := sd.SetDACL(acl, true, false); daclErr != nil {
		return nil, fmt.Errorf("security descriptor dacl: %w", daclErr)
	}

	if controlErr := sd.SetControl(windows.SE_DACL_PROTECTED, windows.SE_DACL_PROTECTED); controlErr != nil {
		return nil, fmt.Errorf("security descriptor control: %w", controlErr)
	}

	selfRelative, err := sd.ToSelfRelative()
	if err != nil {
		return nil, fmt.Errorf("security descriptor: %w", err)
	}

	return selfRelative, nil
}

// securityAttributes points at sd, which the caller keeps alive until the
// process is created.
func securityAttributes(sd *windows.SECURITY_DESCRIPTOR) *syscall.SecurityAttributes {
	return &syscall.SecurityAttributes{
		Length:             uint32(unsafe.Sizeof(syscall.SecurityAttributes{})),
		SecurityDescriptor: uintptr(unsafe.Pointer(sd)),
	}
}

func closeHandle(handle windows.Handle) {
	if handle != 0 {
		windows.CloseHandle(handle) //nolint:errcheck // nothing to do if closing fails
	}
}
