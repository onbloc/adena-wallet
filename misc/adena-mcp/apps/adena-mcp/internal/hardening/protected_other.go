package hardening

// RunProtected is only needed on Windows, where the key-holding server runs
// in a child created with a protected security descriptor.
func RunProtected() (int, bool) { return 0, false }
