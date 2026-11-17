// Package hostinstall registers the agent host with browsers by writing their
// native messaging host manifests. On Windows each manifest is also
// registered under the browser's HKCU NativeMessagingHosts registry key.
package hostinstall

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
)

const goosWindows = "windows"

// HostName is the native messaging host name Adena connects to.
const HostName = "xyz.onbloc.adena_agent"

// Published extension identifiers. Development builds have their own Chrome
// identifier, which is passed with -chrome-extension-id.
const (
	AdenaChromeExtensionID  = "oefglhbffgfkcpboeackfgdagmlnihnh"
	AdenaFirefoxExtensionID = "adena-wallet@onbloc.xyz"
)

const (
	manifestPerm   = 0o644
	hostBinaryPerm = 0o755
	dirPerm        = 0o755
)

// ErrUnsupportedOS is returned for operating systems without a known
// manifest location.
var ErrUnsupportedOS = errors.New("automatic installation supports macOS, Linux and Windows")

// ErrNoRegistry means a Windows installation was attempted without access to
// the Windows registry, which only exists on Windows.
var ErrNoRegistry = errors.New("the Windows registry is not available")

// Registry stores the default value of HKCU registry keys.
type Registry interface {
	SetDefault(key, value string) error
	Delete(key string) error
	Exists(key string) bool
}

// Browser is one browser's per-user native messaging host location.
type Browser struct {
	Name string
	// Root must exist for the browser to be considered installed.
	Root string
	// Dir receives the manifest file.
	Dir string
	// RegistryKey, on Windows, points the browser at the manifest.
	RegistryKey string
	Firefox     bool
}

// Options configures an installation.
type Options struct {
	// Registry overrides the system registry, for tests.
	Registry           Registry
	HostPath           string
	FirefoxExtensionID string
	UserHome           string
	GOOS               string
	// AgentHome is recorded next to the host, so the browser-launched host
	// serves the same socket as adena-mcp. Empty leaves it unrecorded.
	AgentHome          string
	ChromeExtensionIDs []string
}

type manifest struct {
	Name              string   `json:"name"`
	Description       string   `json:"description"`
	Path              string   `json:"path"`
	Type              string   `json:"type"`
	AllowedOrigins    []string `json:"allowed_origins,omitempty"`
	AllowedExtensions []string `json:"allowed_extensions,omitempty"`
}

// Browsers lists the supported browsers for goos.
func Browsers(goos, home string) ([]Browser, error) {
	switch goos {
	case "darwin":
		support := filepath.Join(home, "Library", "Application Support")

		return []Browser{
			chromium("Google Chrome", filepath.Join(support, "Google", "Chrome")),
			chromium("Chromium", filepath.Join(support, "Chromium")),
			chromium("Brave", filepath.Join(support, "BraveSoftware", "Brave-Browser")),
			chromium("Microsoft Edge", filepath.Join(support, "Microsoft Edge")),
			{
				Name:    "Firefox",
				Root:    filepath.Join(support, "Mozilla"),
				Dir:     filepath.Join(support, "Mozilla", "NativeMessagingHosts"),
				Firefox: true,
			},
		}, nil
	case "linux":
		config := filepath.Join(home, ".config")

		return []Browser{
			chromium("Google Chrome", filepath.Join(config, "google-chrome")),
			chromium("Chromium", filepath.Join(config, "chromium")),
			chromium("Brave", filepath.Join(config, "BraveSoftware", "Brave-Browser")),
			chromium("Microsoft Edge", filepath.Join(config, "microsoft-edge")),
			{
				Name:    "Firefox",
				Root:    filepath.Join(home, ".mozilla"),
				Dir:     filepath.Join(home, ".mozilla", "native-messaging-hosts"),
				Firefox: true,
			},
		}, nil
	case goosWindows:
		return windowsBrowsers(home), nil
	default:
		return nil, ErrUnsupportedOS
	}
}

// windowsBrowsers places manifests under the agent home, since Windows
// browsers find them through the registry rather than a fixed directory.
func windowsBrowsers(home string) []Browser {
	local, roaming, agentHome := windowsDirs(home)
	manifests := filepath.Join(agentHome, "native-messaging")

	browser := func(name, root, slug, registryBase string, firefox bool) Browser {
		return Browser{
			Name:        name,
			Root:        root,
			Dir:         filepath.Join(manifests, slug),
			RegistryKey: registryBase + `\NativeMessagingHosts\` + HostName,
			Firefox:     firefox,
		}
	}

	return []Browser{
		browser("Google Chrome", filepath.Join(local, "Google", "Chrome", "User Data"),
			"chrome", `Software\Google\Chrome`, false),
		browser("Chromium", filepath.Join(local, "Chromium", "User Data"),
			"chromium", `Software\Chromium`, false),
		browser("Brave", filepath.Join(local, "BraveSoftware", "Brave-Browser", "User Data"),
			"brave", `Software\BraveSoftware\Brave-Browser`, false),
		browser("Microsoft Edge", filepath.Join(local, "Microsoft", "Edge", "User Data"),
			"edge", `Software\Microsoft\Edge`, false),
		browser("Firefox", filepath.Join(roaming, "Mozilla", "Firefox"),
			"firefox", `Software\Mozilla`, true),
	}
}

// windowsDirs returns %LOCALAPPDATA%, %APPDATA% and the agent home. The
// environment is used only for the real profile of a Windows user, so a
// redirected profile and ADENA_AGENT_HOME are honored; any other home, such
// as one in a test, uses the default layout under it.
func windowsDirs(home string) (string, string, string) {
	local := filepath.Join(home, "AppData", "Local")
	roaming := filepath.Join(home, "AppData", "Roaming")
	agentHome := filepath.Join(home, ".adena-agent")

	if !isRealUserHome(home) {
		return local, roaming, agentHome
	}

	if dir := os.Getenv("LOCALAPPDATA"); dir != "" {
		local = dir
	}

	if dir := os.Getenv("APPDATA"); dir != "" {
		roaming = dir
	}

	if dir, err := agentpath.Home(); err == nil {
		agentHome = dir
	}

	return local, roaming, agentHome
}

func isRealUserHome(home string) bool {
	if runtime.GOOS != goosWindows {
		return false
	}

	userHome, err := os.UserHomeDir()

	return err == nil && strings.EqualFold(filepath.Clean(userHome), filepath.Clean(home))
}

// windowsRegistry returns the registry Windows installs use.
func windowsRegistry(override Registry) (Registry, error) {
	if override != nil {
		return override, nil
	}

	if systemRegistry == nil {
		return nil, ErrNoRegistry
	}

	return systemRegistry, nil
}

func chromium(name, root string) Browser {
	return Browser{Name: name, Root: root, Dir: filepath.Join(root, "NativeMessagingHosts")}
}

// Install writes the host manifest for every installed browser and returns
// the manifest paths it wrote.
func Install(opts Options) ([]string, error) {
	if !filepath.IsAbs(opts.HostPath) {
		return nil, errors.New("host path must be absolute")
	}

	browsers, err := Browsers(opts.GOOS, opts.UserHome)
	if err != nil {
		return nil, err
	}

	if opts.AgentHome != "" {
		if markerErr := agentpath.WriteHomeMarker(filepath.Dir(opts.HostPath), opts.AgentHome); markerErr != nil {
			return nil, markerErr
		}
	}

	var reg Registry

	if opts.GOOS == goosWindows {
		if reg, err = windowsRegistry(opts.Registry); err != nil {
			return nil, err
		}
	}

	written := make([]string, 0, len(browsers))

	for _, browser := range browsers {
		if _, statErr := os.Stat(browser.Root); statErr != nil {
			continue
		}

		path, writeErr := writeManifest(browser, opts)
		if writeErr != nil {
			return written, writeErr
		}

		if reg != nil && browser.RegistryKey != "" {
			if regErr := reg.SetDefault(browser.RegistryKey, path); regErr != nil {
				return written, fmt.Errorf("register %s: %w", browser.Name, regErr)
			}
		}

		written = append(written, path)
	}

	if len(written) == 0 {
		return nil, errors.New("no supported browser was found")
	}

	return written, nil
}

// Uninstall removes the host manifest, and on Windows its registry key, from
// every supported browser and returns the manifest paths it removed.
func Uninstall(goos, home string) ([]string, error) {
	return uninstall(goos, home, nil)
}

func uninstall(goos, home string, override Registry) ([]string, error) {
	browsers, err := Browsers(goos, home)
	if err != nil {
		return nil, err
	}

	var reg Registry

	if goos == goosWindows {
		if reg, err = windowsRegistry(override); err != nil {
			return nil, err
		}
	}

	var removed []string

	for _, browser := range browsers {
		if reg != nil && browser.RegistryKey != "" && reg.Exists(browser.RegistryKey) {
			if regErr := reg.Delete(browser.RegistryKey); regErr != nil {
				return removed, fmt.Errorf("unregister %s: %w", browser.Name, regErr)
			}
		}

		path := manifestPath(browser)

		if removeErr := os.Remove(path); removeErr == nil {
			removed = append(removed, path)
		} else if !errors.Is(removeErr, os.ErrNotExist) {
			return removed, fmt.Errorf("remove %s: %w", path, removeErr)
		}
	}

	return removed, nil
}

func manifestPath(browser Browser) string {
	return filepath.Join(browser.Dir, HostName+".json")
}

func writeManifest(browser Browser, opts Options) (string, error) {
	m := manifest{
		Name:        HostName,
		Description: "Adena AI agent host",
		Path:        opts.HostPath,
		Type:        "stdio",
	}

	if browser.Firefox {
		m.AllowedExtensions = []string{opts.FirefoxExtensionID}
	} else {
		for _, id := range opts.ChromeExtensionIDs {
			m.AllowedOrigins = append(m.AllowedOrigins, "chrome-extension://"+id+"/")
		}
	}

	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return "", fmt.Errorf("encode manifest: %w", err)
	}

	if err := os.MkdirAll(browser.Dir, dirPerm); err != nil {
		return "", fmt.Errorf("create %s: %w", browser.Dir, err)
	}

	path := manifestPath(browser)
	if err := replaceFile(path, append(data, '\n'), manifestPerm); err != nil {
		return "", fmt.Errorf("write %s: %w", path, err)
	}

	return path, nil
}

// replaceFile writes a new file and renames it over path, so an existing file
// is replaced, with its owner and permissions, rather than rewritten in place.
func replaceFile(path string, data []byte, perm os.FileMode) error {
	f, err := os.CreateTemp(filepath.Dir(path), filepath.Base(path)+".*.tmp")
	if err != nil {
		return err
	}

	// Each step is checked before the next: the rename must never run after a
	// failed write, or a truncated file would replace a working one.
	_, writeErr := f.Write(data)
	if err := errors.Join(writeErr, f.Close()); err != nil {
		_ = os.Remove(f.Name())

		return err
	}

	if err := os.Chmod(f.Name(), perm); err != nil {
		_ = os.Remove(f.Name())

		return err
	}

	if err := renameOver(f.Name(), path); err != nil {
		_ = os.Remove(f.Name())

		return err
	}

	return nil
}

// renameOver renames src over dst. Windows refuses to replace a read-only
// file, so dst is made writable and the rename retried once.
func renameOver(src, dst string) error {
	err := os.Rename(src, dst)
	if err == nil {
		return nil
	}

	if chmodErr := os.Chmod(dst, 0o600); chmodErr != nil {
		return err
	}

	return os.Rename(src, dst)
}

// Installed returns the host manifests present for the supported browsers.
// On Windows a manifest only counts while its registry key exists.
func Installed(goos, home string) []string {
	return installed(goos, home, nil)
}

func installed(goos, home string, override Registry) []string {
	browsers, err := Browsers(goos, home)
	if err != nil {
		return nil
	}

	var reg Registry

	if goos == goosWindows {
		if reg, err = windowsRegistry(override); err != nil {
			return nil
		}
	}

	found := make([]string, 0, len(browsers))

	for _, browser := range browsers {
		if _, statErr := os.Stat(manifestPath(browser)); statErr != nil {
			continue
		}

		if reg != nil && browser.RegistryKey != "" && !reg.Exists(browser.RegistryKey) {
			continue
		}

		found = append(found, manifestPath(browser))
	}

	return found
}

// CopyHost copies the host binary at src into binDir and returns the copy's
// path. Browsers launch the host from the path in its manifest, so it must
// not live somewhere transient such as the npx cache.
//
// Windows cannot replace a running executable but can rename one, so the
// current host is moved to a unique ".old.<n>" name first. Retired copies
// that are no longer running are removed on each install.
func CopyHost(src, binDir string) (string, error) {
	// The same protection as the agent home: browsers run what lands here.
	if err := agentpath.EnsureDir(binDir); err != nil {
		return "", err
	}

	data, err := os.ReadFile(src)
	if err != nil {
		return "", fmt.Errorf("read host binary: %w", err)
	}

	target := filepath.Join(binDir, filepath.Base(src))
	sweepRetired(target)

	staging, err := writeStaging(binDir, filepath.Base(src), data)
	if err != nil {
		return "", err
	}

	retired := ""

	if _, statErr := os.Stat(target); statErr == nil {
		retired = fmt.Sprintf("%s.old.%d", target, time.Now().UnixNano())

		if err := os.Rename(target, retired); err != nil {
			_ = os.Remove(staging)

			return "", fmt.Errorf("move previous host binary: %w", err)
		}
	}

	if err := os.Rename(staging, target); err != nil {
		_ = os.Remove(staging)

		if retired != "" {
			if restoreErr := os.Rename(retired, target); restoreErr != nil {
				err = errors.Join(err, fmt.Errorf("restore previous host binary: %w", restoreErr))
			}
		}

		return "", fmt.Errorf("install host binary: %w", err)
	}

	sweepRetired(target)

	return target, nil
}

func writeStaging(dir, name string, data []byte) (string, error) {
	f, err := os.CreateTemp(dir, name+".*.tmp")
	if err != nil {
		return "", fmt.Errorf("write host binary: %w", err)
	}

	_, writeErr := f.Write(data)
	closeErr := f.Close()

	if err := errors.Join(writeErr, closeErr, os.Chmod(f.Name(), hostBinaryPerm)); err != nil {
		_ = os.Remove(f.Name())

		return "", fmt.Errorf("write host binary: %w", err)
	}

	return f.Name(), nil
}

// sweepRetired removes retired and leftover staging copies of target. A copy a
// running host still holds fails to delete and is left for the next install.
func sweepRetired(target string) {
	for _, pattern := range []string{target + ".old*", target + ".*.tmp", target + ".tmp"} {
		matches, err := filepath.Glob(pattern)
		if err != nil {
			continue
		}

		for _, match := range matches {
			_ = os.Remove(match)
		}
	}
}
