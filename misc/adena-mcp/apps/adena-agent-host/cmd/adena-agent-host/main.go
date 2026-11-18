// Command adena-agent-host is the native messaging host the Adena extension
// connects to. Browsers launch it on demand; it relays agent requests from a
// local Unix socket to the extension. The install and uninstall subcommands
// register it with the browsers of the current user.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-agent-host/internal/relay"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/hostinstall"
)

// version is set at build time with -ldflags "-X main.version=...".
var version = "dev"

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "adena-agent-host:", err)
		os.Exit(1)
	}
}

// run dispatches subcommands. Any other arguments come from the browser (the
// caller origin for Chromium, the manifest path and extension id for Firefox)
// and select host mode.
func run(args []string) error {
	if len(args) > 0 {
		switch args[0] {
		case "install":
			return runInstall(args[1:])
		case "uninstall":
			return runUninstall()
		case "version":
			fmt.Println(version)

			return nil
		case "help", "-h", "-help", "--help":
			printUsage()

			return nil
		}
	}

	return serve(args)
}

func printUsage() {
	fmt.Fprint(os.Stderr, `usage:
  adena-agent-host install [-detect=false] [-extension-path dir ...] [-chrome-extension-id id ...]
                           [-firefox-extension-id id]
  adena-agent-host uninstall
  adena-agent-host version

Browsers start the host themselves after "install". Unpacked Adena builds
loaded in Chromium profiles are allowed automatically unless -detect=false.
`)
}

type stringList []string

func (l *stringList) String() string { return strings.Join(*l, ",") }

func (l *stringList) Set(v string) error {
	*l = append(*l, v)

	return nil
}

func runInstall(args []string) error {
	flags := flag.NewFlagSet("install", flag.ContinueOnError)

	var chromeIDs, extensionPaths stringList

	flags.Var(&chromeIDs, "chrome-extension-id", "additional Chromium extension id to allow (repeatable)")
	flags.Var(&extensionPaths, "extension-path", "unpacked Adena build directory to allow (repeatable)")
	detect := flags.Bool("detect", true, "allow unpacked Adena builds loaded in Chromium profiles")
	firefoxID := flags.String("firefox-extension-id", hostinstall.AdenaFirefoxExtensionID, "Firefox extension id to allow")

	if err := flags.Parse(args); err != nil {
		return err
	}

	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve executable: %w", err)
	}

	hostPath, err := filepath.EvalSymlinks(executable)
	if err != nil {
		return fmt.Errorf("resolve executable: %w", err)
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("resolve user home: %w", err)
	}

	allowed, err := hostinstall.AllowedChromeIDs(runtime.GOOS, home, chromeIDs, extensionPaths, *detect)
	if err != nil {
		return err
	}

	for _, found := range allowed.Detected {
		where := found.Path
		if found.Browser != "" {
			where = found.Browser + "/" + found.Profile + " (" + found.Path + ")"
		}

		fmt.Printf("allowing unpacked build %s from %s\n", found.ID, where)
	}

	agentHome, err := agentpath.Home()
	if err != nil {
		return err
	}

	// The copy npm install-host makes lives in the agent home; browsers run it,
	// so that directory must be this user's before it is registered.
	if strings.HasPrefix(hostPath, agentHome+string(filepath.Separator)) {
		for _, dir := range []string{agentHome, filepath.Dir(hostPath)} {
			if dirErr := agentpath.EnsureDir(dir); dirErr != nil {
				return dirErr
			}
		}

		if _, statErr := os.Stat(hostPath); statErr != nil {
			return fmt.Errorf("the host binary is gone after securing %s; run install-host again: %w", agentHome, statErr)
		}
	}

	written, err := hostinstall.Install(hostinstall.Options{
		HostPath:           hostPath,
		ChromeExtensionIDs: allowed.IDs,
		FirefoxExtensionID: *firefoxID,
		UserHome:           home,
		GOOS:               runtime.GOOS,
		AgentHome:          agentHome,
	})
	for _, path := range written {
		fmt.Println("installed", path)
	}

	if err != nil {
		return err
	}

	fmt.Println("enable Settings > Security & Privacy > AI Agent Connection in Adena to connect")

	return nil
}

func runUninstall() error {
	home, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("resolve user home: %w", err)
	}

	removed, err := hostinstall.Uninstall(runtime.GOOS, home)
	for _, path := range removed {
		fmt.Println("removed", path)
	}

	if executable, exeErr := os.Executable(); exeErr == nil {
		marker := filepath.Join(filepath.Dir(executable), agentpath.HomeMarker)
		if removeErr := os.Remove(marker); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
			err = errors.Join(err, fmt.Errorf("remove %s: %w", marker, removeErr))
		}
	}

	return err
}

// serve relays until the browser closes stdin. Stdout carries protocol frames
// only, so logs go to stderr, which browsers write to their own log.
func serve(args []string) error {
	log := slog.New(slog.NewJSONHandler(os.Stderr, nil))

	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve executable: %w", err)
	}

	// The browser does not pass on the MCP client's environment, so the home
	// recorded at install time decides which socket to serve.
	home, err := agentpath.HostHome(executable)
	if err != nil {
		return err
	}

	listener, err := relay.Listen(agentpath.SocketPath(home))
	if err != nil {
		if errors.Is(err, relay.ErrHostRunning) {
			log.Warn("another browser profile already serves agents", "socket", agentpath.SocketPath(home))
		}

		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Info("agent host started", "version", version, "caller", args, "socket", listener.Addr().String())

	return relay.New(os.Stdin, os.Stdout, listener, log).Run(ctx)
}
