// Package install registers the agent host with browsers by writing their
// native messaging host manifests.
package install

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
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
	manifestPerm = 0o644
	dirPerm      = 0o755
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
	HostPath           string
	FirefoxExtensionID string
	UserHome           string
	GOOS               string
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
	if err := os.WriteFile(path, append(data, '\n'), manifestPerm); err != nil {
		return "", fmt.Errorf("write %s: %w", path, err)
	}

	return path, nil
}
