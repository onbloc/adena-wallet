package install

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

// Chromium marks extensions loaded with "Load unpacked" as location 4.
const unpackedLocation = 4

// adenaManifestName identifies an Adena build by its manifest.
const adenaManifestName = "Adena"

// Unpacked is an unpacked Adena build found in a browser profile.
type Unpacked struct {
	ID      string
	Browser string
	Profile string
	Path    string
}

// UnpackedID returns the id Chromium assigns to an extension loaded unpacked
// from dir: the first 128 bits of SHA-256 over the absolute path, written
// with the letters a-p.
func UnpackedID(dir string) (string, error) {
	abs, err := filepath.Abs(dir)
	if err != nil {
		return "", err
	}

	sum := sha256.Sum256([]byte(abs))

	var b strings.Builder

	for _, c := range hex.EncodeToString(sum[:16]) {
		if c <= '9' {
			b.WriteByte(byte('a' + c - '0'))
		} else {
			b.WriteByte(byte('a' + 10 + c - 'a'))
		}
	}

	return b.String(), nil
}

// DetectUnpacked lists unpacked Adena builds loaded in the Chromium profiles
// of the given browsers. Unreadable profiles are skipped.
func DetectUnpacked(browsers []Browser) []Unpacked {
	var found []Unpacked

	for _, browser := range browsers {
		if browser.Firefox {
			continue
		}

		for _, prefs := range profilePreferences(browser.Root) {
			profile := filepath.Base(filepath.Dir(prefs))

			for id, path := range unpackedExtensions(prefs) {
				if isAdenaBuild(path) && !slices.ContainsFunc(found, func(u Unpacked) bool { return u.ID == id }) {
					found = append(found, Unpacked{ID: id, Browser: browser.Name, Profile: profile, Path: path})
				}
			}
		}
	}

	slices.SortFunc(found, func(a, b Unpacked) int { return strings.Compare(a.ID, b.ID) })

	return found
}

// profilePreferences returns the preference files that can hold extension
// settings, across every profile directory under root.
func profilePreferences(root string) []string {
	var files []string

	for _, name := range []string{"Secure Preferences", "Preferences"} {
		matches, err := filepath.Glob(filepath.Join(root, "*", name))
		if err == nil {
			files = append(files, matches...)
		}
	}

	return files
}

func unpackedExtensions(prefsFile string) map[string]string {
	data, err := os.ReadFile(prefsFile)
	if err != nil {
		return nil
	}

	var prefs struct {
		Extensions struct {
			Settings map[string]struct {
				Path     string `json:"path"`
				Location int    `json:"location"`
			} `json:"settings"`
		} `json:"extensions"`
	}

	if json.Unmarshal(data, &prefs) != nil {
		return nil
	}

	out := make(map[string]string)

	for id, ext := range prefs.Extensions.Settings {
		if ext.Location == unpackedLocation && filepath.IsAbs(ext.Path) {
			out[id] = ext.Path
		}
	}

	return out
}

func isAdenaBuild(dir string) bool {
	data, err := os.ReadFile(filepath.Join(dir, "manifest.json"))
	if err != nil {
		return false
	}

	var manifest struct {
		Name string `json:"name"`
	}

	return json.Unmarshal(data, &manifest) == nil && manifest.Name == adenaManifestName
}
