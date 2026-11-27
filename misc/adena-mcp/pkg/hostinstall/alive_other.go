//go:build !unix && !windows

package hostinstall

// processAlive cannot tell here, so another installer's copies are kept.
func processAlive(int) bool { return true }
