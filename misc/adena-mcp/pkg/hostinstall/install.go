// Package hostinstall registers the agent host with browsers by writing their
// native messaging host manifests.
package hostinstall

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
)

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

// ErrUnsupportedOS is returned where manifests are registered another way,
// such as the Windows registry.
var ErrUnsupportedOS = errors.New("automatic installation is supported on macOS and Linux only")

// Browser is one browser's per-user native messaging host directory.
type Browser struct {
	Name string
	// Root must exist for the browser to be considered installed.
	Root    string
	Dir     string
	Firefox bool
}

// Options configures an installation.
type Options struct {
	HostPath string
	// FirefoxExtensionIDs are the Firefox add-on ids to allow; empty allows
	// the store build only.
	FirefoxExtensionIDs []string
	UserHome            string
	GOOS                string
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
	default:
		return nil, ErrUnsupportedOS
	}
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
		if err := agentpath.WriteHomeMarker(filepath.Dir(opts.HostPath), opts.AgentHome); err != nil {
			return nil, err
		}
	}

	written := make([]string, 0, len(browsers))

	for _, browser := range browsers {
		if _, err := os.Stat(browser.Root); err != nil {
			continue
		}

		path, err := writeManifest(browser, opts)
		if err != nil {
			return written, err
		}

		written = append(written, path)
	}

	if len(written) == 0 {
		return nil, errors.New("no supported browser was found")
	}

	return written, nil
}

// Uninstall removes the host manifest from every supported browser and
// returns the paths it removed.
func Uninstall(goos, home string) ([]string, error) {
	browsers, err := Browsers(goos, home)
	if err != nil {
		return nil, err
	}

	var removed []string

	for _, browser := range browsers {
		path := manifestPath(browser)

		if err := os.Remove(path); err == nil {
			removed = append(removed, path)
		} else if !errors.Is(err, os.ErrNotExist) {
			return removed, fmt.Errorf("remove %s: %w", path, err)
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
		m.AllowedExtensions = opts.FirefoxExtensionIDs
		if len(m.AllowedExtensions) == 0 {
			m.AllowedExtensions = []string{AdenaFirefoxExtensionID}
		}
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

	data = append(data, '\n')
	path := manifestPath(browser)

	// adena-mcp syncs the manifests on every start; leave an identical one be.
	if current, readErr := os.ReadFile(path); readErr == nil && bytes.Equal(current, data) && ownedByUser(path) {
		return path, nil
	}

	if err := replaceFile(path, data, manifestPerm); err != nil {
		return "", fmt.Errorf("write %s: %w", path, err)
	}

	return path, nil
}

func ownedByUser(path string) bool {
	owned, err := agentpath.IsOwnedByUser(path)

	return err == nil && owned
}

// InstalledHostPaths returns the host executables the installed manifests
// point browsers at.
func InstalledHostPaths(goos, home string) []string {
	manifests := Installed(goos, home)
	paths := make([]string, 0, len(manifests))

	for _, manifestFile := range manifests {
		data, err := os.ReadFile(manifestFile)
		if err != nil {
			continue
		}

		var m manifest
		if json.Unmarshal(data, &m) != nil || m.Path == "" || slices.Contains(paths, m.Path) {
			continue
		}

		paths = append(paths, m.Path)
	}

	return paths
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
func Installed(goos, home string) []string {
	browsers, err := Browsers(goos, home)
	if err != nil {
		return nil
	}

	var found []string

	for _, browser := range browsers {
		if _, statErr := os.Stat(manifestPath(browser)); statErr == nil {
			found = append(found, manifestPath(browser))
		}
	}

	return found
}

// CopyHost copies the host binary at src into binDir and returns the copy's
// path. Browsers launch the host from the path in its manifest, so it must
// not live somewhere transient such as the npx cache.
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
	staging := target + ".tmp"

	if err := os.WriteFile(staging, data, hostBinaryPerm); err != nil {
		return "", fmt.Errorf("write host binary: %w", err)
	}

	if err := os.Rename(staging, target); err != nil {
		return "", fmt.Errorf("install host binary: %w", err)
	}

	return target, nil
}
