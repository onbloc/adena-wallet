// Package peercred identifies the process on the other end of a local socket
// from what the operating system reports, never from what the peer claims.
// The agent host uses it to identify agents, and adena-mcp to check that the
// socket it dials is served by the installed agent host.
package peercred

// Process is a peer process as the operating system reports it.
type Process struct {
	// Start is the process start time, opaque and OS-specific. With PID it
	// identifies one process even after the pid is reused.
	Start string
	// Exe is the executable path; it may be empty when the OS refuses to
	// resolve it, e.g. for a non-dumpable process on Linux.
	Exe string
	PID int
}
