package hostinstall

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
)

// ExtensionsFile, in the agent home, lists the extension ids besides the
// store builds that may start the host. Every install and every adena-mcp
// start writes the manifests from it, so the list stays in effect across
// reinstalls, upgrades and newly installed browsers.
const ExtensionsFile = "extensions.json"

const extensionsPerm = 0o600

var (
	chromeIDPattern  = regexp.MustCompile(`^[a-p]{32}$`)
	firefoxIDPattern = regexp.MustCompile(`^(\{[0-9a-fA-F-]{36}\}|[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+)$`)
)

// Extension is one allowed extension id and where it came from.
type Extension struct {
	ID string `json:"id"`
	// Source describes the build, e.g. "Google Chrome/Default: /path/to/dist".
	Source  string `json:"source,omitempty"`
	AddedAt int64  `json:"added_at,omitempty"`
}

// Extensions are the user's allowed extension ids. The store builds are
// always allowed and never listed here.
type Extensions struct {
	Chrome  []Extension `json:"chrome,omitempty"`
	Firefox []Extension `json:"firefox,omitempty"`
}

// Browser families an extension id belongs to.
const (
	FamilyChrome  = "chrome"
	FamilyFirefox = "firefox"
)

// FamilyOf tells a Chromium id from a Firefox id, or reports that id is
// neither.
func FamilyOf(id string) (string, error) {
	switch {
	case chromeIDPattern.MatchString(id):
		return FamilyChrome, nil
	case firefoxIDPattern.MatchString(id):
		return FamilyFirefox, nil
	default:
		return "", fmt.Errorf("%q is not a Chromium extension id (32 letters a-p) or a Firefox add-on id", id)
	}
}

// LoadExtensions reads the list from agentHome; a missing file is an empty
// list.
func LoadExtensions(agentHome string) (Extensions, error) {
	data, err := os.ReadFile(filepath.Join(agentHome, ExtensionsFile))
	if errors.Is(err, os.ErrNotExist) {
		return Extensions{}, nil
	}

	if err != nil {
		return Extensions{}, fmt.Errorf("read %s: %w", ExtensionsFile, err)
	}

	var list Extensions
	if err := json.Unmarshal(data, &list); err != nil {
		return Extensions{}, fmt.Errorf("parse %s: %w", ExtensionsFile, err)
	}

	// Entries edited by hand are checked like added ones.
	list.Chrome = slices.DeleteFunc(list.Chrome, func(e Extension) bool { return !chromeIDPattern.MatchString(e.ID) })
	list.Firefox = slices.DeleteFunc(list.Firefox, func(e Extension) bool { return !firefoxIDPattern.MatchString(e.ID) })

	return list, nil
}

// SaveExtensions writes the list to agentHome, readable by this user only.
func SaveExtensions(agentHome string, list Extensions) error {
	if err := agentpath.EnsureDir(agentHome); err != nil {
		return err
	}

	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return fmt.Errorf("encode %s: %w", ExtensionsFile, err)
	}

	return replaceFile(filepath.Join(agentHome, ExtensionsFile), append(data, '\n'), extensionsPerm)
}

// Add allows id and reports whether it was new. Store ids are always allowed
// and are not recorded.
func (l *Extensions) Add(id, source string, now time.Time) (bool, error) {
	family, err := FamilyOf(id)
	if err != nil {
		return false, err
	}

	if id == AdenaChromeExtensionID || id == AdenaFirefoxExtensionID {
		return false, nil
	}

	entries := &l.Chrome
	if family == FamilyFirefox {
		entries = &l.Firefox
	}

	if slices.ContainsFunc(*entries, func(e Extension) bool { return e.ID == id }) {
		return false, nil
	}

	*entries = append(*entries, Extension{ID: id, Source: source, AddedAt: now.Unix()})

	return true, nil
}

// Remove drops id and reports whether it was listed.
func (l *Extensions) Remove(id string) bool {
	before := len(l.Chrome) + len(l.Firefox)
	l.Chrome = slices.DeleteFunc(l.Chrome, func(e Extension) bool { return e.ID == id })
	l.Firefox = slices.DeleteFunc(l.Firefox, func(e Extension) bool { return e.ID == id })

	return len(l.Chrome)+len(l.Firefox) != before
}

// Has reports whether id is allowed, the store builds included.
func (l Extensions) Has(id string) bool {
	return slices.Contains(l.ChromeIDs(), id) || slices.Contains(l.FirefoxIDs(), id)
}

// ChromeIDs returns the Chromium ids to allow: the store build first.
func (l Extensions) ChromeIDs() []string {
	return withStore(AdenaChromeExtensionID, l.Chrome)
}

// FirefoxIDs returns the Firefox ids to allow: the store build first.
func (l Extensions) FirefoxIDs() []string {
	return withStore(AdenaFirefoxExtensionID, l.Firefox)
}

func withStore(store string, entries []Extension) []string {
	ids := []string{store}

	for _, e := range entries {
		if !slices.Contains(ids, e.ID) {
			ids = append(ids, e.ID)
		}
	}

	return ids
}

// Unregistered returns the detected unpacked builds the list does not allow.
func (l Extensions) Unregistered(found []Unpacked) []Unpacked {
	return slices.DeleteFunc(slices.Clone(found), func(u Unpacked) bool { return l.Has(u.ID) })
}

// Describe names where an unpacked build was found.
func (u Unpacked) Describe() string {
	if u.Browser == "" {
		return u.Path
	}

	return strings.TrimSpace(u.Browser+"/"+u.Profile) + ": " + u.Path
}
