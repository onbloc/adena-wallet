//go:build darwin || linux

package peercred

import (
	"errors"
	"fmt"
	"net"
	"os"
)

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
		uid, pid int
		credErr  error
	)

	if err := raw.Control(func(fd uintptr) { uid, pid, credErr = peerCredentials(int(fd)) }); err != nil {
		return nil, err
	}

	if credErr != nil {
		return nil, fmt.Errorf("read peer credentials: %w", credErr)
	}

	if uid != os.Getuid() {
		return nil, fmt.Errorf("peer runs as uid %d", uid)
	}

	// Without a start time a pid cannot be told from a later process that
	// reuses it, so callers that bind to the process must refuse.
	process := &Process{PID: pid}
	if start, startErr := startTimeOf(pid); startErr == nil {
		process.Start = start
	}

	// Linux refuses to resolve the executable of a non-dumpable (hardened)
	// peer, so it may be missing.
	if exe, exeErr := Executable(pid); exeErr == nil {
		process.Exe = exe
	}

	return process, nil
}
