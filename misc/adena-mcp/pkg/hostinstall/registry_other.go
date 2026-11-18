//go:build !windows

package hostinstall

// systemRegistry is nil off Windows; Windows installs need Options.Registry.
var systemRegistry Registry
