// Command adena-mcp is an MCP server over stdio that lets an AI agent act on
// gno.land as the Adena user through session accounts. The user authorizes
// and revokes each session in Adena; the agent signs with the session key via
// gnokey and never sees the user's master key.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/config"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/gnokey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/tools"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// version is set at build time with -ldflags "-X main.version=...".
var version = "dev"

const instructions = "adena-mcp lets you act on gno.land as the user of the Adena wallet, through " +
	"session accounts the user approves in Adena.\n" +
	"- Start with adena_status: it shows whether Adena is reachable, the user's address and network, " +
	"and the sessions you hold.\n" +
	"- Before writing, call adena_session_create with the narrowest allow_paths the task needs " +
	"(\"vm/exec:<realm path>\" per realm), a low spend_limit and a short expires_in. The user sees and " +
	"approves the request in Adena; the call blocks until they decide. A session cannot be widened, " +
	"so ask for a new one if the scope changes.\n" +
	"- Write with adena_call, adena_run or adena_send. The chain sees the user's address as the caller. " +
	"Gas fees are charged against the session spend limit.\n" +
	"- When the task is done, call adena_session_revoke. The user approves the revocation in Adena.\n" +
	"- Never ask the user for a seed phrase or private key. Deploying packages (addpkg) is not " +
	"possible with a session.\n" +
	"- If Adena is unreachable, ask the user to open the browser, unlock Adena and enable " +
	"Settings > Security & Privacy > AI Agent Connection, and to install the agent host " +
	"(adena-agent-host install) once."

func main() {
	if len(os.Args) > 1 && os.Args[1] == "version" {
		fmt.Println(version)

		return
	}

	if err := run(); err != nil {
		slog.Error("adena-mcp stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	// Stdout carries the MCP protocol, so logs go to stderr.
	log := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	slog.SetDefault(log)

	conf, err := config.Load()
	if err != nil {
		return err
	}

	for _, dir := range []string{conf.Home, conf.DataDir, conf.KeybaseDir()} {
		if err := agentpath.EnsureDir(dir); err != nil {
			return err
		}
	}

	registry := server.NewRegistry()
	tools.Register(registry, &tools.Deps{
		Bridge: &bridge.Client{SocketPath: conf.SocketPath()},
		Gnokey: gnokey.New(conf.GnokeyBin, conf.KeybaseDir()),
		Store:  session.NewStore(conf.SessionsFile()),
		Config: conf,
	})

	mcpServer := mcp.NewServer(
		&mcp.Implementation{Name: "adena-mcp", Version: version},
		&mcp.ServerOptions{Instructions: instructions, Logger: log},
	)

	if err := registry.Publish(mcpServer, log); err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	return mcpServer.Run(ctx, &mcp.StdioTransport{})
}
