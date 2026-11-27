//go:build !darwin && !linux

package peercred

import (
	"errors"
	"net"
)

// Of cannot identify the peer here; the socket's permissions remain the only
// access control.
func Of(net.Conn) (*Process, error) { return &Process{}, nil }

// Executable is not available here.
func Executable(int) (string, error) { return "", errors.New("unsupported platform") }
