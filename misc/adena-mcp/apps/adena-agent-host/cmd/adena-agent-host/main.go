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

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-agent-host/internal/install"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-agent-host/internal/relay"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
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
  adena-agent-host install [-chrome-extension-id id ...] [-firefox-extension-id id]
  adena-agent-host uninstall
  adena-agent-host version

Browsers start the host themselves after "install".
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

	var chromeIDs stringList

	flags.Var(&chromeIDs, "chrome-extension-id", "additional Chromium extension id to allow (repeatable)")
	firefoxID := flags.String("firefox-extension-id", install.AdenaFirefoxExtensionID, "Firefox extension id to allow")

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

	written, err := install.Install(install.Options{
		HostPath:           hostPath,
		ChromeExtensionIDs: append([]string{install.AdenaChromeExtensionID}, chromeIDs...),
		FirefoxExtensionID: *firefoxID,
		UserHome:           home,
		GOOS:               runtime.GOOS,
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

	removed, err := install.Uninstall(runtime.GOOS, home)
	for _, path := range removed {
		fmt.Println("removed", path)
	}

	return err
}

// serve relays until the browser closes stdin. Stdout carries protocol frames
// only, so logs go to stderr, which browsers write to their own log.
func serve(args []string) error {
	log := slog.New(slog.NewJSONHandler(os.Stderr, nil))

	home, err := agentpath.Home()
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
