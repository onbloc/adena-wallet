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

	peer := &bridge.Peer{PID: pid}

	// Without an executable the connection can still be approved, but it is
	// then bound to "unknown" and any unidentified program matches it.
	if exe, exeErr := executableOf(pid); exeErr == nil {
		peer.Exe = exe
	}

	return peer, nil
}
