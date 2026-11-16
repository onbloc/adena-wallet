package hostinstall

import (
	"os"
	"path/filepath"
	"testing"
)

type fakeRegistry struct {
	values map[string]string
}

func (f *fakeRegistry) SetDefault(key, value string) error {
	f.values[key] = value

	return nil
}

func (f *fakeRegistry) Delete(key string) error {
	delete(f.values, key)

	return nil
}

func (f *fakeRegistry) Exists(key string) bool {
	_, ok := f.values[key]

	return ok
}

func TestWindowsInstallRegistersManifests(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	reg := &fakeRegistry{values: map[string]string{}}

	for _, dir := range []string{
		filepath.Join(home, "AppData", "Local", "Google", "Chrome", "User Data"),
		filepath.Join(home, "AppData", "Roaming", "Mozilla", "Firefox"),
	} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
	}

	written, err := Install(Options{
		HostPath:            filepath.Join(home, "adena-agent-host.exe"),
		ChromeExtensionIDs:  []string{AdenaChromeExtensionID},
		FirefoxExtensionIDs: []string{AdenaFirefoxExtensionID},
		UserHome:            home,
		GOOS:                "windows",
		Registry:            reg,
	})
	if err != nil {
		t.Fatal(err)
	}

	if len(written) != 2 || len(reg.values) != 2 {
		t.Fatalf("written %v, registry %v", written, reg.values)
	}

	chromeKey := `Software\Google\Chrome\NativeMessagingHosts\` + HostName
	firefoxKey := `Software\Mozilla\NativeMessagingHosts\` + HostName

	var chrome manifest

	readJSON(t, reg.values[chromeKey], &chrome)

	if chrome.AllowedOrigins[0] != "chrome-extension://"+AdenaChromeExtensionID+"/" {
		t.Fatalf("unexpected chrome manifest %+v", chrome)
	}

	var firefox manifest

	readJSON(t, reg.values[firefoxKey], &firefox)

	if len(firefox.AllowedExtensions) != 1 {
		t.Fatalf("unexpected firefox manifest %+v", firefox)
	}

	if got := installed("windows", home, reg); len(got) != 2 {
		t.Fatalf("installed %v", got)
	}

	delete(reg.values, chromeKey)

	if got := installed("windows", home, reg); len(got) != 1 {
		t.Fatalf("a manifest without its registry key must not count, got %v", got)
	}

	removed, err := uninstall("windows", home, reg)
	if err != nil || len(removed) != 2 || len(reg.values) != 0 {
		t.Fatalf("removed %v, registry %v, err %v", removed, reg.values, err)
	}
}

func TestWindowsInstallWithoutRegistry(t *testing.T) {
	t.Parallel()

	if systemRegistry != nil {
		t.Skip("the system registry exists on this OS")
	}

	_, err := Install(Options{HostPath: "/x/host.exe", UserHome: t.TempDir(), GOOS: "windows"})
	if err == nil {
		t.Fatal("expected ErrNoRegistry")
	}
}

func TestWindowsRejectsExtensionPath(t *testing.T) {
	t.Parallel()

	if _, err := AllowedChromeIDs("windows", t.TempDir(), nil, []string{`C:\adena\dist`}, false); err == nil {
		t.Fatal("expected an error for -extension-path on Windows")
	}
}

func TestCopyHostReplacesExistingBinary(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	src := filepath.Join(dir, "src", "adena-agent-host")
	bin := filepath.Join(dir, "bin")

	if err := os.MkdirAll(filepath.Dir(src), 0o755); err != nil {
		t.Fatal(err)
	}

	for _, content := range []string{"v1", "v2"} {
		if err := os.WriteFile(src, []byte(content), 0o755); err != nil {
			t.Fatal(err)
		}

		target, err := CopyHost(src, bin)
		if err != nil {
			t.Fatal(err)
		}

		data, err := os.ReadFile(target)
		if err != nil || string(data) != content {
			t.Fatalf("got %q %v, want %q", data, err, content)
		}
	}

	entries, err := os.ReadDir(bin)
	if err != nil || len(entries) != 1 {
		t.Fatalf("leftover files %v %v", entries, err)
	}
}
