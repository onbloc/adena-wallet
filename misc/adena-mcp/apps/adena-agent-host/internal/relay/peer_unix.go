//go:build darwin || linux

package relay

import (
	"errors"
	"fmt"
	"net"
	"os"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

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

	// Without a start time the extension cannot tell this process from a
	// later one with the same pid, and refuses to connect it.
	peer := &bridge.Peer{PID: pid}
	if start, startErr := startTimeOf(pid); startErr == nil {
		peer.Start = start
	}

	// The executable is only shown to the user. Linux refuses to resolve it
	// for a non-dumpable (hardened) peer, so it may be missing.
	if exe, exeErr := executableOf(pid); exeErr == nil {
		peer.Exe = exe
	}

	return peer, nil
}
