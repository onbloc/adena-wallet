package main

import (
	"os"

	"golang.org/x/sys/unix"
)

// isTerminal reports whether a person can answer on f.
func isTerminal(f *os.File) bool {
	_, err := unix.IoctlGetTermios(int(f.Fd()), unix.TIOCGETA)

	return err == nil
}
