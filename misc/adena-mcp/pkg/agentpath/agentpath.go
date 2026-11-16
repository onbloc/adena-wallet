// Package agentpath resolves the on-disk locations shared by the agent host
// and the MCP server.
package agentpath

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

// HomeEnv overrides the default home directory.
const HomeEnv = "ADENA_AGENT_HOME"

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

	if info.Mode().Perm() != dirPerm {
		if err := os.Chmod(dir, dirPerm); err != nil {
			return fmt.Errorf("chmod %s: %w", dir, err)
		}
	}

	return nil
}
