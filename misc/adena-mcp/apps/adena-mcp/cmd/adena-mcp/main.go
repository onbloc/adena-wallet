// Command adena-mcp is an MCP server over stdio that lets an AI agent act on
// gno.land as the Adena user through session accounts. The user authorizes
// and revokes each session in Adena. Session keys are generated in locked
// memory without a seed phrase, sign in process, and are never stored, logged
// or shown to the agent.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/chain"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/config"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/hardening"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/sessionkey"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/tools"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
)

// version is set at build time with -ldflags "-X main.version=...".
var version = "dev"

const instructions = "adena tools let you act on gno.land as the user of the Adena wallet.\n" +
	"- Start with get_status. If it is not ready, follow its next_step; connect_wallet installs the " +
	"agent host when missing and asks the user to approve the connection in Adena.\n" +
	"- The default flow is sessions: create_session with the narrowest allow_paths the task needs " +
	"(\"vm/exec:<realm path>\" per realm, \"vm/run\", \"bank/send\"), a low spend_limit and a short " +
	"expires_in. The user approves it in Adena once; send_transaction and sign_transaction then sign " +
	"with the session key without popups. Gas fees count against the spend limit.\n" +
	"- Use signer=\"wallet\" only when the user asks to approve a transaction directly, or for " +
	"/vm.m_addpkg, which sessions can never sign. The user approves each such transaction in Adena.\n" +
	"- Call revoke_session when the task is done. Session keys live only in this server's memory and " +
	"are lost on restart; revoke such sessions and create new ones.\n" +
	"- Never ask the user for a seed phrase or private key."

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

	// Applied before any key exists, so no key is ever in a dumpable process.
	if err := hardening.Apply(); err != nil {
		log.Warn("process hardening incomplete", "error", err)
	}

	conf, err := config.Load()
	if err != nil {
		return err
	}

	for _, dir := range []string{conf.Home, conf.DataDir} {
		if err := agentpath.EnsureDir(dir); err != nil {
			return err
		}
	}

	store := session.NewStore(conf.SessionsFile())
	if err := removeLegacySecrets(conf, store, log); err != nil {
		return err
	}

	keys := sessionkey.NewKeyring()
	defer keys.DestroyAll()

	registry := server.NewRegistry()
	tools.Register(registry, &tools.Deps{
		Bridge: &bridge.Client{SocketPath: conf.SocketPath()},
		Chain:  chain.NewClient(),
		Host:   hostInstaller{agentHome: conf.Home},
		Keys:   keys,
		Store:  store,
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

// removeLegacySecrets deletes the gnokey keybase and keybase passwords that
// earlier versions stored on disk.
func removeLegacySecrets(conf config.Config, store *session.Store, log *slog.Logger) error {
	if _, err := os.Stat(conf.LegacyKeybaseDir()); err == nil {
		if err := os.RemoveAll(conf.LegacyKeybaseDir()); err != nil {
			return fmt.Errorf("remove legacy keybase: %w", err)
		}

		log.Warn("removed session keys stored by an earlier version; revoke their sessions in Adena",
			"path", conf.LegacyKeybaseDir())
	}

	return store.Scrub()
}
