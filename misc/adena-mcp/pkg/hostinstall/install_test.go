package hostinstall

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
)

func TestInstallWritesManifestsForInstalledBrowsers(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	chromeRoot := filepath.Join(home, ".config", "google-chrome")
	firefoxRoot := filepath.Join(home, ".mozilla")

	for _, dir := range []string{chromeRoot, firefoxRoot} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
	}

	hostPath := filepath.Join(home, "bin", "adena-agent-host")

	written, err := Install(Options{
		HostPath:           hostPath,
		ChromeExtensionIDs: []string{AdenaChromeExtensionID, "devid"},
		FirefoxExtensionID: AdenaFirefoxExtensionID,
		UserHome:           home,
		GOOS:               "linux",
	})
	if err != nil {
		t.Fatal(err)
	}

	if len(written) != 2 {
		t.Fatalf("wrote %v, want chrome and firefox only", written)
	}

	var chrome manifest

	readJSON(t, filepath.Join(chromeRoot, "NativeMessagingHosts", HostName+".json"), &chrome)

	if chrome.Path != hostPath || chrome.Type != "stdio" || len(chrome.AllowedOrigins) != 2 {
		t.Fatalf("unexpected chrome manifest %+v", chrome)
	}

	if chrome.AllowedOrigins[0] != "chrome-extension://"+AdenaChromeExtensionID+"/" {
		t.Fatalf("unexpected origin %q", chrome.AllowedOrigins[0])
	}

	var firefox manifest

	readJSON(t, filepath.Join(firefoxRoot, "native-messaging-hosts", HostName+".json"), &firefox)

	if len(firefox.AllowedExtensions) != 1 || firefox.AllowedOrigins != nil {
		t.Fatalf("unexpected firefox manifest %+v", firefox)
	}

	removed, err := Uninstall("linux", home)
	if err != nil || len(removed) != 2 {
		t.Fatalf("uninstall removed %v, err %v", removed, err)
	}
}

func TestInstallRequiresAbsoluteHostPath(t *testing.T) {
	t.Parallel()

	if _, err := Install(Options{HostPath: "adena-agent-host", GOOS: "linux"}); err == nil {
		t.Fatal("expected an error for a relative host path")
	}
}

func TestInstallUnsupportedOS(t *testing.T) {
	t.Parallel()

	home := t.TempDir()

	_, err := Install(Options{HostPath: filepath.Join(home, "x"), GOOS: "plan9", UserHome: home})
	if !errors.Is(err, ErrUnsupportedOS) {
		t.Fatalf("got %v, want ErrUnsupportedOS", err)
	}
}

func readJSON(t *testing.T, path string, out any) {
	t.Helper()

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	if err := json.Unmarshal(data, out); err != nil {
		t.Fatal(err)
	}
}

func TestInstallRecordsTheAgentHomeNextToTheHost(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	if err := os.MkdirAll(filepath.Join(home, ".config", "google-chrome"), 0o755); err != nil {
		t.Fatal(err)
	}

	bin := t.TempDir()
	agentHome := filepath.Join(t.TempDir(), "custom")

	if _, err := Install(Options{
		HostPath:           filepath.Join(bin, "adena-agent-host"),
		ChromeExtensionIDs: []string{AdenaChromeExtensionID},
		UserHome:           home,
		GOOS:               "linux",
		AgentHome:          agentHome,
	}); err != nil {
		t.Fatal(err)
	}

	got, err := agentpath.HostHome(filepath.Join(bin, "adena-agent-host"))
	if err != nil || got != agentHome {
		t.Fatalf("got %q %v, want %q", got, err, agentHome)
	}
}

func TestInstallReplacesAnExistingManifestFile(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	chromeRoot := filepath.Join(home, ".config", "google-chrome")
	// Built from a temp dir so it is absolute on Windows too.
	hostPath := filepath.Join(home, "bin", "adena-agent-host")

	browsers, browsersErr := Browsers("linux", home)
	if browsersErr != nil {
		t.Fatal(browsersErr)
	}

	// A planted, read-only manifest pointing elsewhere is replaced as a new
	// file, not rewritten in place.
	planted := manifestPath(browsers[0])
	for _, dir := range []string{chromeRoot, filepath.Dir(planted)} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
	}

	if err := os.WriteFile(planted, []byte(`{"path":"/tmp/evil"}`), 0o444); err != nil {
		t.Fatal(err)
	}

	_, installErr := Install(Options{
		HostPath:           hostPath,
		ChromeExtensionIDs: []string{AdenaChromeExtensionID},
		UserHome:           home,
		GOOS:               "linux",
	})
	if installErr != nil {
		t.Fatal(installErr)
	}

	// The planted file was read-only, so a writable file with the new content
	// can only be a replacement. os.SameFile is no help here: on Windows it
	// reads both file ids from the path at comparison time.
	after, statAfterErr := os.Stat(planted)
	if statAfterErr != nil {
		t.Fatal(statAfterErr)
	}

	if after.Mode().Perm()&0o200 == 0 {
		t.Fatalf("the manifest is still the planted read-only file (%v)", after.Mode())
	}

	var m manifest

	readJSON(t, planted, &m)

	if m.Path != hostPath {
		t.Fatalf("manifest path %q", m.Path)
	}

	leftovers, globErr := filepath.Glob(filepath.Join(filepath.Dir(planted), "*.tmp"))
	if globErr != nil || len(leftovers) != 0 {
		t.Fatalf("staging left behind: %v %v", leftovers, globErr)
	}
}

func TestCopyHostRetiresThePreviousCopyUnderAUniqueName(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	src := filepath.Join(dir, "src", "adena-agent-host")
	bin := filepath.Join(dir, "bin")

	if err := os.MkdirAll(filepath.Dir(src), 0o700); err != nil {
		t.Fatal(err)
	}

	target := filepath.Join(bin, "adena-agent-host")

	for i, body := range []string{"v1", "v2", "v3"} {
		if err := os.WriteFile(src, []byte(body), 0o700); err != nil {
			t.Fatal(err)
		}

		// A retired copy and a staging file left by an earlier install, as when
		// a running host kept them locked or a rename failed.
		if i == 1 {
			for _, leftover := range []string{target + ".old", target + ".old.1", target + ".123.tmp"} {
				if err := os.WriteFile(leftover, nil, 0o600); err != nil {
					t.Fatal(err)
				}
			}
		}

		got, err := CopyHost(src, bin)
		if err != nil {
			t.Fatalf("install %d: %v", i+1, err)
		}

		data, err := os.ReadFile(got)
		if err != nil || string(data) != body {
			t.Fatalf("install %d: got %q %v", i+1, data, err)
		}
	}

	entries, err := os.ReadDir(bin)
	if err != nil {
		t.Fatal(err)
	}

	if len(entries) != 1 {
		names := make([]string, 0, len(entries))
		for _, e := range entries {
			names = append(names, e.Name())
		}

		t.Fatalf("leftovers were not swept: %v", names)
	}
}
