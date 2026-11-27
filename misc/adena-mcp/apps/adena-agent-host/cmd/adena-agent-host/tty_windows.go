package main

import (
	"os"

	"golang.org/x/sys/windows"
)

// isTerminal reports whether a person can answer on f.
func isTerminal(f *os.File) bool {
	var mode uint32

	return windows.GetConsoleMode(windows.Handle(f.Fd()), &mode) == nil
}
