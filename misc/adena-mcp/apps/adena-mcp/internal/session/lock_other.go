//go:build !unix

package session

// lockFile is a no-op where no file lock is implemented; the in-process
// mutex still serializes this process.
func lockFile(string) (func(), error) { return func() {}, nil }
