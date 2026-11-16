package install

import (
	"os"
	"path/filepath"
	"testing"
)

func TestUnpackedIDMatchesChromium(t *testing.T) {
	t.Parallel()

	// Observed in Chrome for this path.
	got, err := UnpackedID("/Users/onbloc/.paseo/worktrees/1ddqwii6/black-hound/packages/adena-extension/dist")
	if err != nil {
		t.Fatal(err)
	}

	if got != "ageeiiepclgijgimgllbeebmgblnflje" {
		t.Fatalf("got %s", got)
	}
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
}

func TestDetectUnpackedFindsAdenaBuilds(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	adena := filepath.Join(home, "adena", "dist")
	other := filepath.Join(home, "other", "dist")

	writeFile(t, filepath.Join(adena, "manifest.json"), `{"name":"Adena","manifest_version":3}`)
	writeFile(t, filepath.Join(other, "manifest.json"), `{"name":"Other"}`)

	root := filepath.Join(home, ".config", "google-chrome")
	writeFile(t, filepath.Join(root, "Profile 3", "Secure Preferences"), `{"extensions":{"settings":{
		"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa":{"location":4,"path":"`+adena+`"},
		"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb":{"location":4,"path":"`+other+`"},
		"oefglhbffgfkcpboeackfgdagmlnihnh":{"location":1}
	}}}`)
	writeFile(t, filepath.Join(root, "Default", "Preferences"), `not json`)

	browsers, err := Browsers("linux", home)
	if err != nil {
		t.Fatal(err)
	}

	found := DetectUnpacked(browsers)
	if len(found) != 1 {
		t.Fatalf("got %+v", found)
	}

	got := found[0]
	if got.ID != "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" || got.Profile != "Profile 3" || got.Browser != "Google Chrome" {
		t.Fatalf("unexpected %+v", got)
	}
}
