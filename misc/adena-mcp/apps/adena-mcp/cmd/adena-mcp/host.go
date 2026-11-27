package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/hostinstall"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/peercred"
)

// hostBinEnv points at the adena-agent-host binary when it is not next to
// adena-mcp, which is where both the npm package and make build-all put it.
const (
	hostBinEnv     = "ADENA_AGENT_HOST_BIN"
	hostBinaryName = "adena-agent-host"
	versionTimeout = 5 * time.Second
)

// hostInstaller registers and maintains the agent host for adena-mcp.
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
// into a transient directory such as the npx cache, and registers it for the
// store builds and the ids the user allowed.
func (h hostInstaller) Install() ([]string, error) {
	src, err := hostBinary()
	if err != nil {
		return nil, err
	}

	target, err := hostinstall.CopyHost(src, h.binDir())
	if err != nil {
		return nil, err
	}

	return h.register(target)
}

// register writes the manifests for hostPath. Detected unpacked builds are
// never added here: an agent-triggered install must not trust an extension
// for being named "Adena". Only ids the user added are.
func (h hostInstaller) register(hostPath string) ([]string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("resolve user home: %w", err)
	}

	list, err := hostinstall.LoadExtensions(h.agentHome)
	if err != nil {
		return nil, err
	}

	return hostinstall.Install(hostinstall.Options{
		HostPath:            hostPath,
		ChromeExtensionIDs:  list.ChromeIDs(),
		FirefoxExtensionIDs: list.FirefoxIDs(),
		UserHome:            home,
		GOOS:                runtime.GOOS,
		AgentHome:           h.agentHome,
	})
}

// Sync keeps an installed host current: it upgrades the copy in the agent
// home when this release ships a newer one, and rewrites the manifests from
// the allowed extension list, which also covers browsers installed since.
// It changes nothing while the host is not installed; connect_wallet does
// that on demand.
func (h hostInstaller) Sync(ctx context.Context, log *slog.Logger) {
	home, err := os.UserHomeDir()
	if err != nil {
		return
	}

	paths := hostinstall.InstalledHostPaths(runtime.GOOS, home)
	if len(paths) == 0 {
		return
	}

	// A development host registered from elsewhere is left where it is.
	hostPath := paths[0]
	managed := filepath.Join(h.binDir(), filepath.Base(hostPath))

	if samePath(hostPath, managed) {
		if upgraded, upgradeErr := h.upgrade(ctx, managed); upgradeErr != nil {
			log.Warn("could not upgrade the agent host", "error", upgradeErr)
		} else if upgraded {
			log.Info("upgraded the agent host", "path", managed, "version", version)
		}
	}

	if _, regErr := h.register(hostPath); regErr != nil {
		log.Warn("could not update the agent host registration", "error", regErr)
	}
}

// upgrade replaces target with the bundled host when this release is newer.
func (h hostInstaller) upgrade(ctx context.Context, target string) (bool, error) {
	if !newerVersion(version, binaryVersion(ctx, target)) {
		return false, nil
	}

	src, err := hostBinary()
	if err != nil {
		return false, err
	}

	if _, err := hostinstall.CopyHost(src, filepath.Dir(target)); err != nil {
		return false, err
	}

	return true, nil
}

// Hints describe unpacked Adena builds in the user's browsers that may not
// start the host, with the command that allows one.
func (h hostInstaller) Hints() []string {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	browsers, err := hostinstall.Browsers(runtime.GOOS, home)
	if err != nil {
		return nil
	}

	list, err := hostinstall.LoadExtensions(h.agentHome)
	if err != nil {
		return []string{err.Error()}
	}

	hints := make([]string, 0, 2)

	for _, u := range list.Unregistered(hostinstall.DetectUnpacked(browsers)) {
		hints = append(hints, fmt.Sprintf("An unpacked Adena build %s (%s) is not allowed to use the agent "+
			"host. If the user uses that build, have them run: npx -y @adena-wallet/mcp extensions add %s",
			u.ID, u.Describe(), u.ID))
	}

	return hints
}

// VerifyHost accepts only a socket served by a host executable that a
// browser manifest names, so another program on the path is refused before a
// request reaches it.
func (h hostInstaller) VerifyHost(p *peercred.Process) error {
	if p.Exe == "" {
		return errors.New("the serving process could not be identified")
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	allowed := append(hostinstall.InstalledHostPaths(runtime.GOOS, home), filepath.Join(h.binDir(), hostFileName()))
	for _, path := range allowed {
		if samePath(p.Exe, path) {
			return nil
		}
	}

	return fmt.Errorf("it is %s (pid %d)", p.Exe, p.PID)
}

func (h hostInstaller) binDir() string {
	return filepath.Join(h.agentHome, "bin")
}

func hostFileName() string {
	if runtime.GOOS == "windows" {
		return hostBinaryName + ".exe"
	}

	return hostBinaryName
}

func samePath(a, b string) bool {
	if resolved, err := filepath.EvalSymlinks(a); err == nil {
		a = resolved
	}

	if resolved, err := filepath.EvalSymlinks(b); err == nil {
		b = resolved
	}

	if runtime.GOOS == "windows" {
		return strings.EqualFold(filepath.Clean(a), filepath.Clean(b))
	}

	return filepath.Clean(a) == filepath.Clean(b)
}

func binaryVersion(ctx context.Context, path string) string {
	ctx, cancel := context.WithTimeout(ctx, versionTimeout)
	defer cancel()

	out, err := exec.CommandContext(ctx, path, "version").Output()
	if err != nil {
		return ""
	}

	return strings.TrimSpace(string(out))
}

// newerVersion reports whether release is a newer semver than installed. An
// installed host that reports no version is replaced; development builds
// ("dev", git describe output) are never replaced automatically.
func newerVersion(release, installed string) bool {
	next, ok := parseVersion(release)
	if !ok {
		return false
	}

	if installed == "" {
		return true
	}

	current, ok := parseVersion(installed)
	if !ok {
		return false
	}

	for i := range 3 {
		if next.parts[i] != current.parts[i] {
			return next.parts[i] > current.parts[i]
		}
	}

	// A release is newer than its own prereleases.
	return next.pre == "" && current.pre != ""
}

type semver struct {
	pre   string
	parts [3]int
}

func parseVersion(v string) (semver, bool) {
	core, pre, _ := strings.Cut(strings.TrimPrefix(v, "v"), "-")

	fields := strings.Split(core, ".")
	if len(fields) != 3 {
		return semver{}, false
	}

	var out semver

	for i, field := range fields {
		n, err := strconv.Atoi(field)
		if err != nil || n < 0 {
			return semver{}, false
		}

		out.parts[i] = n
	}

	out.pre = pre

	return out, true
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

	candidate := filepath.Join(filepath.Dir(resolved), hostFileName())
	if _, statErr := os.Stat(candidate); statErr != nil {
		return "", errors.New(hostBinaryName + " was not found next to adena-mcp; set " + hostBinEnv)
	}

	return candidate, nil
}
