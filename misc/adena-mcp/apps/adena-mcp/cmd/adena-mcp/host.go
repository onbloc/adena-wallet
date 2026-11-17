package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/hostinstall"
)

// hostBinEnv points at the adena-agent-host binary when it is not next to
// adena-mcp, which is where both the npm package and make build-all put it.
const (
	hostBinEnv     = "ADENA_AGENT_HOST_BIN"
	hostBinaryName = "adena-agent-host"
)

// hostInstaller registers the agent host for connect_wallet.
type hostInstaller struct {
	agentHome string
}

func (h hostInstaller) Installed() bool {
	home, err := os.UserHomeDir()
	if err != nil {
		return false
	}

	return len(hostinstall.Installed(runtime.GOOS, home)) > 0
}

// Install copies the host under the agent home, so the manifest never points
// into a transient directory such as the npx cache, and registers it.
func (h hostInstaller) Install() ([]string, error) {
	src, err := hostBinary()
	if err != nil {
		return nil, err
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("resolve user home: %w", err)
	}

	target, err := hostinstall.CopyHost(src, filepath.Join(h.agentHome, "bin"))
	if err != nil {
		return nil, err
	}

	// Unpacked builds are allowed only when the user runs install themselves;
	// an agent-triggered install must not trust any extension named "Adena".
	allowed, err := hostinstall.AllowedChromeIDs(runtime.GOOS, home, nil, nil, false)
	if err != nil {
		return nil, err
	}

	return hostinstall.Install(hostinstall.Options{
		HostPath:           target,
		ChromeExtensionIDs: allowed.IDs,
		FirefoxExtensionID: hostinstall.AdenaFirefoxExtensionID,
		UserHome:           home,
		GOOS:               runtime.GOOS,
		AgentHome:          h.agentHome,
	})
}

func hostBinary() (string, error) {
	if path := os.Getenv(hostBinEnv); path != "" {
		return path, nil
	}

	executable, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("resolve executable: %w", err)
	}

	resolved, err := filepath.EvalSymlinks(executable)
	if err != nil {
		return "", fmt.Errorf("resolve executable: %w", err)
	}

	candidate := filepath.Join(filepath.Dir(resolved), hostBinaryName)
	if _, statErr := os.Stat(candidate); statErr != nil {
		return "", errors.New(hostBinaryName + " was not found next to adena-mcp; set " + hostBinEnv)
	}

	return candidate, nil
}
