//go:build windows

package relay

// restrictSocket relies on the agent home's ACL on Windows, where the socket
// file has no permission bits to set.
func restrictSocket(string) error { return nil }
