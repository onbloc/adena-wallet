package main

import (
	"bufio"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/hostinstall"
)

// extensionSetup edits the allowed extension list of the agent home.
type extensionSetup struct {
	in      *bufio.Reader
	out     io.Writer
	home    string
	agent   string
	list    hostinstall.Extensions
	changed bool
	// interactive is true when a person answers on stdin.
	interactive bool
}

func newExtensionSetup() (*extensionSetup, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("resolve user home: %w", err)
	}

	agentHome, err := agentpath.Home()
	if err != nil {
		return nil, err
	}

	list, err := hostinstall.LoadExtensions(agentHome)
	if err != nil {
		return nil, err
	}

	return &extensionSetup{
		in:          bufio.NewReader(os.Stdin),
		out:         os.Stdout,
		home:        home,
		agent:       agentHome,
		list:        list,
		interactive: isTerminal(os.Stdin),
	}, nil
}

func (s *extensionSetup) add(id, source string) error {
	added, err := s.list.Add(id, source, time.Now())
	if err != nil {
		return err
	}

	if added {
		s.changed = true
		fmt.Fprintf(s.out, "allowed %s (%s)\n", id, source)
	}

	return nil
}

func (s *extensionSetup) addPaths(paths []string) error {
	allowed, err := hostinstall.AllowedChromeIDs(runtime.GOOS, s.home, nil, paths, false)
	if err != nil {
		return err
	}

	for _, found := range allowed.Detected {
		if err := s.add(found.ID, found.Path); err != nil {
			return err
		}
	}

	return nil
}

// review offers each detected unpacked Adena build that is not allowed yet.
// A build is recognized only by its manifest name, so none is allowed
// without the user's answer or -allow-detected.
func (s *extensionSetup) review(allowAll bool) error {
	browsers, err := hostinstall.Browsers(runtime.GOOS, s.home)
	if err != nil {
		return err
	}

	for _, u := range s.list.Unregistered(hostinstall.DetectUnpacked(browsers)) {
		allow := allowAll
		if !allow && s.interactive {
			allow = s.confirm(fmt.Sprintf("Allow the unpacked Adena build %s from %s to use the agent host?",
				u.ID, u.Describe()))
		}

		if !allow {
			fmt.Fprintf(s.out, "not allowed: unpacked build %s from %s; allow it with: extensions add %s\n",
				u.ID, u.Describe(), u.ID)

			continue
		}

		if err := s.add(u.ID, u.Describe()); err != nil {
			return err
		}
	}

	return nil
}

func (s *extensionSetup) confirm(question string) bool {
	fmt.Fprintf(s.out, "%s [y/N] ", question)

	answer, err := s.in.ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return false
	}

	answer = strings.ToLower(strings.TrimSpace(answer))

	return answer == "y" || answer == "yes"
}

func (s *extensionSetup) save() error {
	if !s.changed {
		return nil
	}

	return hostinstall.SaveExtensions(s.agent, s.list)
}

// register writes the manifests for hostPath with the allowed list.
func (s *extensionSetup) register(hostPath string) ([]string, error) {
	return hostinstall.Install(hostinstall.Options{
		HostPath:            hostPath,
		ChromeExtensionIDs:  s.list.ChromeIDs(),
		FirefoxExtensionIDs: s.list.FirefoxIDs(),
		UserHome:            s.home,
		GOOS:                runtime.GOOS,
		AgentHome:           s.agent,
	})
}

// resync rewrites installed manifests after the list changed.
func (s *extensionSetup) resync() error {
	paths := hostinstall.InstalledHostPaths(runtime.GOOS, s.home)
	if len(paths) == 0 {
		fmt.Fprintln(s.out, "the agent host is not installed yet; the list applies once it is "+
			"(npx -y @adena-wallet/mcp setup)")

		return nil
	}

	written, err := s.register(paths[0])
	for _, path := range written {
		fmt.Fprintln(s.out, "updated", path)
	}

	return err
}

func (s *extensionSetup) print() {
	fmt.Fprintln(s.out, "Chromium extension ids allowed to start the agent host:")

	for _, id := range s.list.ChromeIDs() {
		fmt.Fprintf(s.out, "  %s  %s\n", id, s.source(id))
	}

	fmt.Fprintln(s.out, "Firefox add-on ids:")

	for _, id := range s.list.FirefoxIDs() {
		fmt.Fprintf(s.out, "  %s  %s\n", id, s.source(id))
	}
}

func (s *extensionSetup) source(id string) string {
	if id == hostinstall.AdenaChromeExtensionID || id == hostinstall.AdenaFirefoxExtensionID {
		return "(store build, always allowed)"
	}

	for _, e := range append(append([]hostinstall.Extension(nil), s.list.Chrome...), s.list.Firefox...) {
		if e.ID == id {
			return e.Source
		}
	}

	return ""
}

func runInstall(args []string) error {
	flags := flag.NewFlagSet("install", flag.ContinueOnError)

	var chromeIDs, firefoxIDs, extensionPaths stringList

	flags.Var(&chromeIDs, "chrome-extension-id", "Chromium extension id to allow, kept for later installs (repeatable)")
	flags.Var(&firefoxIDs, "firefox-extension-id", "Firefox add-on id to allow besides the store build (repeatable)")
	flags.Var(&extensionPaths, "extension-path", "unpacked Adena build directory to allow (repeatable, not on Windows)")
	detect := flags.Bool("detect", true, "look for unpacked Adena builds loaded in Chromium profiles and offer them")
	allowDetected := flags.Bool("allow-detected", false, "allow every detected unpacked Adena build without asking")
	copyToHome := flags.Bool("copy", false, "copy this host into the agent home's bin directory and register the copy")

	if err := flags.Parse(args); err != nil {
		return err
	}

	hostPath, err := installedExecutable()
	if err != nil {
		return err
	}

	if *copyToHome {
		if hostPath, err = copyIntoHome(hostPath); err != nil {
			return err
		}

		fmt.Println("copied the agent host to", hostPath)
	}

	s, err := newExtensionSetup()
	if err != nil {
		return err
	}

	for _, id := range append(chromeIDs, firefoxIDs...) {
		if id == hostinstall.AdenaFirefoxExtensionID {
			continue
		}

		if addErr := s.add(id, "added with install"); addErr != nil {
			return addErr
		}
	}

	if addErr := s.addPaths(extensionPaths); addErr != nil {
		return addErr
	}

	if *detect {
		if reviewErr := s.review(*allowDetected); reviewErr != nil {
			return reviewErr
		}
	}

	if saveErr := s.save(); saveErr != nil {
		return saveErr
	}

	written, err := s.register(hostPath)
	for _, path := range written {
		fmt.Println("installed", path)
	}

	if err != nil {
		return err
	}

	fmt.Println("enable Settings > Security & Privacy > AI Agent Connection in Adena to connect")

	return nil
}

// copyIntoHome copies the host at self into the agent home's bin directory,
// which is checked (and on Windows taken over) before anything is written to
// it, so the browser never runs a file from the npx cache or a directory
// another account controls. The npm launcher runs the packaged host for this
// instead of running a copy it made itself.
func copyIntoHome(self string) (string, error) {
	agentHome, err := agentpath.Home()
	if err != nil {
		return "", err
	}

	if err := agentpath.EnsureDir(agentHome); err != nil {
		return "", err
	}

	return hostinstall.CopyHost(self, filepath.Join(agentHome, "bin"))
}

// installedExecutable returns this host's path, after securing the agent home
// when the host lives there: browsers run what is registered.
func installedExecutable() (string, error) {
	executable, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("resolve executable: %w", err)
	}

	hostPath, err := filepath.EvalSymlinks(executable)
	if err != nil {
		return "", fmt.Errorf("resolve executable: %w", err)
	}

	agentHome, err := agentpath.Home()
	if err != nil {
		return "", err
	}

	if strings.HasPrefix(hostPath, agentHome+string(filepath.Separator)) {
		for _, dir := range []string{agentHome, filepath.Dir(hostPath)} {
			if dirErr := agentpath.EnsureDir(dir); dirErr != nil {
				return "", dirErr
			}
		}

		if _, statErr := os.Stat(hostPath); statErr != nil {
			return "", fmt.Errorf("the host binary is gone after securing %s; run install-host again: %w", agentHome, statErr)
		}
	}

	return hostPath, nil
}

func runExtensions(args []string) error {
	s, err := newExtensionSetup()
	if err != nil {
		return err
	}

	command := "list"
	if len(args) > 0 {
		command, args = args[0], args[1:]
	}

	switch command {
	case "list":
		s.print()

		return s.review(false)
	case "add":
		return s.runAdd(args)
	case "remove":
		return s.runRemove(args)
	case "detect":
		flags := flag.NewFlagSet("extensions detect", flag.ContinueOnError)
		allow := flags.Bool("allow", false, "allow every detected build without asking")

		if err := flags.Parse(args); err != nil {
			return err
		}

		if err := s.review(*allow); err != nil {
			return err
		}

		return s.finish()
	default:
		return fmt.Errorf("unknown extensions command %q; use list, add, remove or detect", command)
	}
}

func (s *extensionSetup) runAdd(args []string) error {
	flags := flag.NewFlagSet("extensions add", flag.ContinueOnError)

	var paths stringList

	flags.Var(&paths, "path", "unpacked Adena build directory (repeatable, not on Windows)")

	if err := flags.Parse(args); err != nil {
		return err
	}

	if flags.NArg() == 0 && len(paths) == 0 {
		return errors.New("usage: extensions add <extension id>... | -path <unpacked build dir>")
	}

	for _, id := range flags.Args() {
		if err := s.add(id, "added by hand"); err != nil {
			return err
		}
	}

	if err := s.addPaths(paths); err != nil {
		return err
	}

	return s.finish()
}

func (s *extensionSetup) runRemove(ids []string) error {
	if len(ids) == 0 {
		return errors.New("usage: extensions remove <extension id> [<extension id> ...]")
	}

	for _, id := range ids {
		if id == hostinstall.AdenaChromeExtensionID || id == hostinstall.AdenaFirefoxExtensionID {
			return fmt.Errorf("%s is the store build and is always allowed", id)
		}

		if s.list.Remove(id) {
			s.changed = true
			fmt.Fprintln(s.out, "removed", id)
		} else {
			fmt.Fprintln(s.out, "not listed:", id)
		}
	}

	return s.finish()
}

func (s *extensionSetup) finish() error {
	if !s.changed {
		return nil
	}

	if err := s.save(); err != nil {
		return err
	}

	return s.resync()
}
