package hostinstall

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"
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

	written, err := Install(Options{
		HostPath:           "/opt/adena/adena-agent-host",
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

	if chrome.Path != "/opt/adena/adena-agent-host" || chrome.Type != "stdio" || len(chrome.AllowedOrigins) != 2 {
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

	_, err := Install(Options{HostPath: "/x", GOOS: "windows", UserHome: t.TempDir()})
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
