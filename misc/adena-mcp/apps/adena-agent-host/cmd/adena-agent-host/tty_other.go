//go:build !darwin && !linux

package main

import "os"

// isTerminal never asks on other platforms; pass -allow-detected instead.
func isTerminal(*os.File) bool { return false }
