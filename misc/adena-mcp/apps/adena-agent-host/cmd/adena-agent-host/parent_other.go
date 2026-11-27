//go:build !windows

package main

import "errors"

// Browsers start the host directly here, so its parent is the browser.
func parentOf(int) (int, error) { return 0, errors.New("not needed on this platform") }
