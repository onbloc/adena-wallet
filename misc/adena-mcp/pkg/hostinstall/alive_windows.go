package hostinstall

import "golang.org/x/sys/windows"

const stillActive = 259 // STILL_ACTIVE

// processAlive reports whether pid names a running process.
func processAlive(pid int) bool {
	//nolint:gosec // pids fit in uint32
	handle, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, uint32(pid))
	if err != nil {
		// Access denied still means the process exists.
		return err == windows.ERROR_ACCESS_DENIED //nolint:errorlint // a plain errno
	}

	defer windows.CloseHandle(handle) //nolint:errcheck // nothing to do if closing a query handle fails

	var code uint32
	if err := windows.GetExitCodeProcess(handle, &code); err != nil {
		return true
	}

	return code == stillActive
}
