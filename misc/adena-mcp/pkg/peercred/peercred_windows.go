package peercred

import (
	"errors"
	"fmt"
	"math"
	"net"
	"unsafe"

	"golang.org/x/sys/windows"
)

// sioAFUnixGetPeerPID is SIO_AF_UNIX_GETPEERPID from afunix.h.
const sioAFUnixGetPeerPID = windows.IOC_OUT | windows.IOC_VENDOR | 256

// Of identifies the process on the other end of conn and refuses one running
// as another user.
func Of(conn net.Conn) (*Process, error) {
	unixConn, ok := conn.(*net.UnixConn)
	if !ok {
		return nil, errors.New("not a unix socket connection")
	}

	raw, err := unixConn.SyscallConn()
	if err != nil {
		return nil, err
	}

	var (
		pid    uint32
		ioErr  error
		output uint32
	)

	if controlErr := raw.Control(func(fd uintptr) {
		ioErr = windows.WSAIoctl(windows.Handle(fd), sioAFUnixGetPeerPID, nil, 0,
			(*byte)(unsafe.Pointer(&pid)), uint32(unsafe.Sizeof(pid)), &output, nil, 0)
	}); controlErr != nil {
		return nil, controlErr
	}

	if ioErr != nil {
		return nil, fmt.Errorf("read peer pid: %w", ioErr)
	}

	process, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
	if err != nil {
		return nil, fmt.Errorf("open peer process: %w", err)
	}

	defer windows.CloseHandle(process) //nolint:errcheck // nothing to do if closing a query handle fails

	if err := requireSameUser(process); err != nil {
		return nil, err
	}

	peer := &Process{PID: int(pid)}

	if exe, exeErr := imageName(process); exeErr == nil {
		peer.Exe = exe
	}

	return peer, nil
}

func requireSameUser(process windows.Handle) error {
	var token windows.Token
	if err := windows.OpenProcessToken(process, windows.TOKEN_QUERY, &token); err != nil {
		return fmt.Errorf("open peer token: %w", err)
	}

	defer func() { _ = token.Close() }()

	peerUser, err := token.GetTokenUser()
	if err != nil {
		return fmt.Errorf("read peer user: %w", err)
	}

	self, err := windows.GetCurrentProcessToken().GetTokenUser()
	if err != nil {
		return fmt.Errorf("read own user: %w", err)
	}

	if !peerUser.User.Sid.Equals(self.User.Sid) {
		return fmt.Errorf("peer runs as %s", peerUser.User.Sid.String())
	}

	return nil
}

// Executable returns the executable path of pid.
func Executable(pid int) (string, error) {
	if pid <= 0 || pid > math.MaxUint32 {
		return "", fmt.Errorf("invalid pid %d", pid)
	}

	process, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, uint32(pid))
	if err != nil {
		return "", fmt.Errorf("open process: %w", err)
	}

	defer windows.CloseHandle(process) //nolint:errcheck // nothing to do if closing a query handle fails

	return imageName(process)
}

func imageName(process windows.Handle) (string, error) {
	size := uint32(windows.MAX_LONG_PATH)
	buf := make([]uint16, size)

	if err := windows.QueryFullProcessImageName(process, 0, &buf[0], &size); err != nil {
		return "", err
	}

	return windows.UTF16ToString(buf[:size]), nil
}
