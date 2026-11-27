// Command adena-agent-host is the native messaging host the Adena extension
// connects to. Browsers launch it on demand; it relays agent requests from a
// local Unix socket to the extension. The install and uninstall subcommands
// register it with the browsers of the current user.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-agent-host/internal/relay"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/hostinstall"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/nativemsg"
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
		case "extensions":
			return runExtensions(args[1:])
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
  adena-agent-host install [-detect=false] [-allow-detected] [-extension-path dir ...]
                           [-chrome-extension-id id ...] [-firefox-extension-id id ...]
  adena-agent-host extensions [list | add <id>... | add -path <dir> | remove <id>... | detect [-allow]]
  adena-agent-host uninstall
  adena-agent-host version

Browsers start the host themselves after "install". The store builds of Adena
are always allowed; other builds (unpacked or development ids) are allowed
once added, and the list in the agent home is kept across installs and
upgrades. install offers the unpacked Adena builds it finds in Chromium
profiles and allows only those you confirm.
`)
}

type stringList []string

func (l *stringList) String() string { return strings.Join(*l, ",") }

func (l *stringList) Set(v string) error {
	*l = append(*l, v)

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

	socket := agentpath.SocketPath(home)

	listener, err := relay.Listen(socket)
	if err != nil {
		if errors.Is(err, relay.ErrHostRunning) {
			busy := runningBrowser(socket)
			log.Warn("another browser already serves agents", "socket", socket, "browser", busy)

			if notifyErr := notifyBusy(busy); notifyErr != nil {
				log.Warn("could not tell the extension", "error", notifyErr)
			}
		}

		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Info("agent host started", "version", version, "caller", args, "socket", listener.Addr().String())

	r := relay.New(os.Stdin, os.Stdout, listener, log)
	r.Info = bridge.HostInfo{Version: version, Browser: browserName(), ExtensionID: callerExtensionID(args)}

	return r.Run(ctx)
}

// runningBrowser asks the host that already serves socket which browser it
// belongs to.
func runningBrowser(socket string) string {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	var info bridge.HostInfo

	client := bridge.Client{SocketPath: socket}
	if client.Call(ctx, bridge.MethodHostInfo, nil, &info) != nil {
		return ""
	}

	return info.Browser
}

// notifyBusy tells this browser's Adena why the host is exiting, so it can
// show the user which browser serves agents instead.
func notifyBusy(browser string) error {
	message, err := json.Marshal(bridge.HostEvent{Event: bridge.HostBusyEvent, Browser: browser})
	if err != nil {
		return err
	}

	return nativemsg.Write(os.Stdout, message)
}
