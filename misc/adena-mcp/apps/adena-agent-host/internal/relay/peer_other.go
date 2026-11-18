//go:build !darwin && !linux

package relay

import (
	"net"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// peerOf cannot identify the peer here; the socket's permissions remain the
// only access control.
func peerOf(net.Conn) (*bridge.Peer, error) { return nil, nil }
