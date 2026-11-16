// Package config resolves the MCP server settings from the environment.
package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
)

// Environment variables.
const (
	GnokeyEnv          = "ADENA_MCP_GNOKEY"
	ApprovalTimeoutEnv = "ADENA_MCP_APPROVAL_TIMEOUT"
	GasCeilingEnv      = "ADENA_MCP_GAS_CEILING"
)

// Session limits applied before a request reaches Adena, which enforces the
// same lifetime cap.
const (
	DefaultSessionTTL = time.Hour
	MaxSessionTTL     = 7 * 24 * time.Hour
	DefaultSpendLimit = "5000000ugnot"
	DefaultAgentName  = "adena-mcp"
)

const (
	defaultApprovalTimeout = 5 * time.Minute
	defaultGasCeiling      = 10_000_000
)

// Config configures the MCP server.
type Config struct {
	// Home is the shared agent home holding the host socket.
	Home string
	// DataDir holds the session keybase and session records.
	DataDir   string
	GnokeyBin string
	// ApprovalTimeout bounds how long a tool waits for the user in Adena.
	ApprovalTimeout time.Duration
	// GasCeiling is the gas limit used to measure a transaction before it is
	// broadcast with a right-sized limit.
	GasCeiling int64
}

// KeybaseDir is the gnokey home for session keys.
func (c Config) KeybaseDir() string { return filepath.Join(c.DataDir, "keys") }

// SessionsFile stores the session records.
func (c Config) SessionsFile() string { return filepath.Join(c.DataDir, "sessions.json") }

// SocketPath is the agent host socket.
func (c Config) SocketPath() string { return agentpath.SocketPath(c.Home) }

// Load reads the configuration from the environment.
func Load() (Config, error) {
	home, err := agentpath.Home()
	if err != nil {
		return Config{}, err
	}

	c := Config{
		Home:            home,
		DataDir:         filepath.Join(home, "mcp"),
		GnokeyBin:       "gnokey",
		ApprovalTimeout: defaultApprovalTimeout,
		GasCeiling:      defaultGasCeiling,
	}

	if bin := os.Getenv(GnokeyEnv); bin != "" {
		c.GnokeyBin = bin
	}

	if v := os.Getenv(ApprovalTimeoutEnv); v != "" {
		timeout, parseErr := time.ParseDuration(v)
		if parseErr != nil || timeout <= 0 {
			return Config{}, fmt.Errorf("%s must be a positive duration", ApprovalTimeoutEnv)
		}

		c.ApprovalTimeout = timeout
	}

	if v := os.Getenv(GasCeilingEnv); v != "" {
		ceiling, parseErr := strconv.ParseInt(v, 10, 64)
		if parseErr != nil || ceiling <= 0 {
			return Config{}, fmt.Errorf("%s must be a positive integer", GasCeilingEnv)
		}

		c.GasCeiling = ceiling
	}

	return c, nil
}
