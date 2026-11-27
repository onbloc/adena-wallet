package hostinstall

import (
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"testing"
	"time"
)

const testChromeID = "abcdefghijklmnopabcdefghijklmnop"

func TestExtensionsAddValidatesAndKeepsStoreBuildsImplicit(t *testing.T) {
	t.Parallel()

	var list Extensions

	bad := []string{"", "short", "ABCDEFGHIJKLMNOPABCDEFGHIJKLMNOP", "qrstuvwxyzqrstuvwxyzqrstuvwxyzqr", "a b@c"}
	for _, bad := range bad {
		if _, err := list.Add(bad, "", time.Now()); err == nil {
			t.Errorf("%q must be refused", bad)
		}
	}

	for _, store := range []string{AdenaChromeExtensionID, AdenaFirefoxExtensionID} {
		if added, err := list.Add(store, "", time.Now()); err != nil || added {
			t.Fatalf("store id %s: added=%v err=%v", store, added, err)
		}
	}

	if added, err := list.Add(testChromeID, "dev", time.Now()); err != nil || !added {
		t.Fatalf("added=%v err=%v", added, err)
	}

	if added, err := list.Add(testChromeID, "dev", time.Now()); err != nil || added {
		t.Fatalf("a listed id must not be added twice: added=%v err=%v", added, err)
	}

	if added, err := list.Add("adena-dev@example.com", "dev", time.Now()); err != nil || !added {
		t.Fatalf("firefox id: added=%v err=%v", added, err)
	}

	if got := list.ChromeIDs(); !slices.Equal(got, []string{AdenaChromeExtensionID, testChromeID}) {
		t.Fatalf("chrome ids %v", got)
	}

	if got := list.FirefoxIDs(); !slices.Equal(got, []string{AdenaFirefoxExtensionID, "adena-dev@example.com"}) {
		t.Fatalf("firefox ids %v", got)
	}

	if !list.Remove(testChromeID) || list.Has(testChromeID) || list.Remove(testChromeID) {
		t.Fatal("remove must drop the id once")
	}
}

func TestExtensionsRoundTripAndDropInvalidEntries(t *testing.T) {
	t.Parallel()

	home := t.TempDir()

	empty, err := LoadExtensions(home)
	if err != nil || len(empty.Chrome)+len(empty.Firefox) != 0 {
		t.Fatalf("a missing file is an empty list, got %+v %v", empty, err)
	}

	list := Extensions{Chrome: []Extension{{ID: testChromeID, Source: "dev"}}}
	if saveErr := SaveExtensions(home, list); saveErr != nil {
		t.Fatal(saveErr)
	}

	path := filepath.Join(home, ExtensionsFile)

	if runtime.GOOS != "windows" {
		info, statErr := os.Stat(path)
		if statErr != nil || info.Mode().Perm() != extensionsPerm {
			t.Fatalf("the list must be private, got %v %v", info, statErr)
		}
	}

	// A hand-edited entry that is not an extension id is ignored.
	edited := `{"chrome":[{"id":"` + testChromeID + `"},{"id":"../../evil"}],"firefox":[{"id":"x y"}]}`
	if writeErr := os.WriteFile(path, []byte(edited), extensionsPerm); writeErr != nil {
		t.Fatal(writeErr)
	}

	loaded, err := LoadExtensions(home)
	if err != nil {
		t.Fatal(err)
	}

	if len(loaded.Chrome) != 1 || loaded.Chrome[0].ID != testChromeID || len(loaded.Firefox) != 0 {
		t.Fatalf("unexpected list %+v", loaded)
	}
}

func TestUnregisteredSkipsAllowedBuilds(t *testing.T) {
	t.Parallel()

	list := Extensions{Chrome: []Extension{{ID: testChromeID}}}
	found := []Unpacked{
		{ID: testChromeID},
		{ID: "ponmlkjihgfedcbaponmlkjihgfedcba", Browser: "Chrome", Profile: "Default", Path: "/b"},
	}

	got := list.Unregistered(found)
	if len(got) != 1 || got[0].ID != "ponmlkjihgfedcbaponmlkjihgfedcba" || got[0].Describe() != "Chrome/Default: /b" {
		t.Fatalf("unexpected %+v", got)
	}
}

func TestInstallLeavesAnIdenticalManifestAndReportsHostPaths(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	chromeRoot := filepath.Join(home, ".config", "google-chrome")

	if err := os.MkdirAll(chromeRoot, 0o755); err != nil {
		t.Fatal(err)
	}

	opts := Options{
		HostPath:           filepath.Join(home, "bin", "adena-agent-host"),
		ChromeExtensionIDs: []string{AdenaChromeExtensionID},
		UserHome:           home,
		GOOS:               "linux",
	}

	if _, err := Install(opts); err != nil {
		t.Fatal(err)
	}

	path := filepath.Join(chromeRoot, "NativeMessagingHosts", HostName+".json")

	before, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}

	old := before.ModTime().Add(-time.Hour)
	if chtimesErr := os.Chtimes(path, old, old); chtimesErr != nil {
		t.Fatal(chtimesErr)
	}

	if _, installErr := Install(opts); installErr != nil {
		t.Fatal(installErr)
	}

	after, err := os.Stat(path)
	if err != nil || !after.ModTime().Equal(old) {
		t.Fatalf("an identical manifest must not be rewritten: %v %v", after, err)
	}

	opts.ChromeExtensionIDs = append(opts.ChromeExtensionIDs, testChromeID)
	if _, installErr := Install(opts); installErr != nil {
		t.Fatal(installErr)
	}

	if changed, statErr := os.Stat(path); statErr != nil || changed.ModTime().Equal(old) {
		t.Fatalf("a changed manifest must be rewritten: %v", statErr)
	}

	if got := InstalledHostPaths("linux", home); !slices.Equal(got, []string{opts.HostPath}) {
		t.Fatalf("host paths %v", got)
	}
}
