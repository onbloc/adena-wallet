package relay

import (
	"bytes"
	"errors"

	"golang.org/x/sys/unix"
)

// peerCredentials returns the peer's uid and pid.
func peerCredentials(fd int) (int, int, error) {
	cred, err := unix.GetsockoptXucred(fd, unix.SOL_LOCAL, unix.LOCAL_PEERCRED)
	if err != nil {
		return 0, 0, err
	}

	pid, err := unix.GetsockoptInt(fd, unix.SOL_LOCAL, unix.LOCAL_PEERPID)
	if err != nil {
		return 0, 0, err
	}

	return int(cred.Uid), pid, nil
}

// executableOf reads the executable path from kern.procargs2, which starts
// with argc followed by the NUL-terminated path.
func executableOf(pid int) (string, error) {
	data, err := unix.SysctlRaw("kern.procargs2", pid)
	if err != nil {
		return "", err
	}

	if len(data) < 5 {
		return "", errors.New("short kern.procargs2")
	}

	path, _, found := bytes.Cut(data[4:], []byte{0})
	if !found || len(path) == 0 {
		return "", errors.New("no executable path in kern.procargs2")
	}

	return string(path), nil
}
