package relay

import (
	"os"
	"strconv"

	"golang.org/x/sys/unix"
)

// peerCredentials returns the peer's uid and pid.
func peerCredentials(fd int) (int, int, error) {
	cred, err := unix.GetsockoptUcred(fd, unix.SOL_SOCKET, unix.SO_PEERCRED)
	if err != nil {
		return 0, 0, err
	}

	return int(cred.Uid), int(cred.Pid), nil
}

func executableOf(pid int) (string, error) {
	return os.Readlink("/proc/" + strconv.Itoa(pid) + "/exe")
}
