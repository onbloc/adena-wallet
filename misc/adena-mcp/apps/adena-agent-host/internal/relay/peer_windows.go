package relay

import (
	"errors"
	"fmt"
	"net"
	"strconv"
	"unsafe"

	"golang.org/x/sys/windows"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// sioAFUnixGetPeerPID is SIO_AF_UNIX_GETPEERPID from afunix.h.
const sioAFUnixGetPeerPID = windows.IOC_OUT | windows.IOC_VENDOR | 256

// peerOf identifies the process on the other end of conn and refuses one
// running as another user.
func peerOf(conn net.Conn) (*bridge.Peer, error) {
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

	peer := &bridge.Peer{PID: int(pid)}

	// With the pid, the creation time identifies this process; Adena refuses
	// to connect a process without it.
	var creation, exit, kernel, user windows.Filetime
	if timesErr := windows.GetProcessTimes(process, &creation, &exit, &kernel, &user); timesErr == nil {
		peer.Start = strconv.FormatInt(creation.Nanoseconds(), 10)
	}

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

func imageName(process windows.Handle) (string, error) {
	size := uint32(windows.MAX_LONG_PATH)
	buf := make([]uint16, size)

	if err := windows.QueryFullProcessImageName(process, 0, &buf[0], &size); err != nil {
		return "", err
	}

	return windows.UTF16ToString(buf[:size]), nil
}
