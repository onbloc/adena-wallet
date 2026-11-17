//go:build !windows

package agentpath

// restrictDir is only used on Windows; elsewhere EnsureDir sets mode bits.
func restrictDir(string) error { return nil }
