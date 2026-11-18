//go:build !darwin && !linux && !windows

package relay

import (
	"net"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// peerOf cannot identify the peer here, so the connection is bound to an
// unknown program; the socket's permissions remain the only access control.
func peerOf(net.Conn) (*bridge.Peer, error) { return &bridge.Peer{}, nil }
