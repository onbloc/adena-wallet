// Package agentpath resolves the on-disk locations shared by the agent host
// and the MCP server.
package agentpath

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// HomeEnv overrides the default home directory.
const HomeEnv = "ADENA_AGENT_HOME"

// HomeMarker is the file next to an installed host that records the agent
// home it was installed for. Browsers launch the host without the MCP
// client's environment, so ADENA_AGENT_HOME would otherwise be lost.
const HomeMarker = "agent-home"

const markerPerm = 0o600

const goosWindows = "windows"

const (
	defaultDirName = ".adena-agent"
	socketName     = "agent.sock"
	dirPerm        = 0o700
)

// Home returns the agent home directory, honoring ADENA_AGENT_HOME.
func Home() (string, error) {
	if dir := os.Getenv(HomeEnv); dir != "" {
		return filepath.Abs(dir)
	}

	userHome, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("resolve user home: %w", err)
	}

	return filepath.Join(userHome, defaultDirName), nil
}

// HostHome returns the agent home for the host at executable:
// ADENA_AGENT_HOME, then the home recorded next to it at install, then the
// default.
func HostHome(executable string) (string, error) {
	if dir := os.Getenv(HomeEnv); dir != "" {
		return filepath.Abs(dir)
	}

	data, err := os.ReadFile(filepath.Join(filepath.Dir(executable), HomeMarker))
	if err == nil {
		if dir := strings.TrimSpace(string(data)); filepath.IsAbs(dir) {
			return filepath.Clean(dir), nil
		}
	}

	return Home()
}

// WriteHomeMarker records home next to the host binary in binDir.
func WriteHomeMarker(binDir, home string) error {
	abs, err := filepath.Abs(home)
	if err != nil {
		return err
	}

	// Replaced rather than rewritten, so an existing file's owner does not
	// carry over.
	marker := filepath.Join(binDir, HomeMarker)
	if err := os.Remove(marker); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("record agent home: %w", err)
	}

	if err := os.WriteFile(marker, []byte(abs+"\n"), markerPerm); err != nil {
		return fmt.Errorf("record agent home: %w", err)
	}

	return nil
}

// SocketPath returns the Unix socket the host listens on.
func SocketPath(home string) string {
	return filepath.Join(home, socketName)
}

// EnsureDir creates dir with owner-only permissions and tightens an existing
// one, since it holds the socket and session keys.
func EnsureDir(dir string) error {
	if err := os.MkdirAll(dir, dirPerm); err != nil {
		return fmt.Errorf("create %s: %w", dir, err)
	}

	info, err := os.Stat(dir)
	if err != nil {
		return fmt.Errorf("stat %s: %w", dir, err)
	}

	if !info.IsDir() {
		return errors.New(dir + " is not a directory")
	}

	// Windows has no permission bits; an owner-only ACL takes their place, so
	// a home outside the user profile (ADENA_AGENT_HOME) is protected too.
	if runtime.GOOS == goosWindows {
		return restrictDir(dir)
	}

	// Checked directly: a chmod only fails for another owner when the mode is
	// wrong, and an ACL can still let this user in.
	if !dirOwnedByUser(info) {
		return fmt.Errorf("%s is owned by another user; remove it or choose another %s", dir, HomeEnv)
	}

	if info.Mode().Perm() != dirPerm {
		if err := os.Chmod(dir, dirPerm); err != nil {
			return fmt.Errorf("chmod %s: %w", dir, err)
		}
	}

	return nil
}
