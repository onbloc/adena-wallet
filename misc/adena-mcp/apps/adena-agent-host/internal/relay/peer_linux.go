package relay

import (
	"errors"
	"os"
	"strconv"
	"strings"

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

// startTimeOf reads field 22 of /proc/<pid>/stat, the start time in clock
// ticks since boot. Unlike /proc/<pid>/exe it is readable for a non-dumpable
// process.
func startTimeOf(pid int) (string, error) {
	data, err := os.ReadFile("/proc/" + strconv.Itoa(pid) + "/stat")
	if err != nil {
		return "", err
	}

	// The command name in field 2 may contain spaces; fields after it do not.
	end := strings.LastIndexByte(string(data), ')')
	if end < 0 {
		return "", errors.New("malformed /proc stat")
	}

	fields := strings.Fields(string(data[end+1:]))

	const startField = 22 - 3 // fields 3.. follow the command name
	if len(fields) <= startField {
		return "", errors.New("short /proc stat")
	}

	return fields[startField], nil
}
