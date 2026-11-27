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

// skipHostCheckEnv=1 lets a host that no browser manifest names serve the
// socket, for debugging the host by hand.
const skipHostCheckEnv = "ADENA_MCP_SKIP_HOST_CHECK"

const instructions = "adena tools let you act on gno.land as the user of the Adena wallet.\n" +
	"- Start with get_status. If it is not ready, follow its next_step; connect_wallet installs the " +
	"agent host when missing and asks the user to approve the connection in Adena.\n" +
	"- The default flow is sessions: create_session with the narrowest allow_paths the task needs " +
	"(\"vm/exec:<full realm path>\" per realm, \"bank/send\"; \"vm/run\" only if get_status reports " +
	"vm_run_allowed), a low spend_limit, spend_period 0 and a short expires_in. The user approves it in " +
	"Adena once; send_transaction and sign_transaction then sign with the session key without popups. " +
	"Gas fees count against the spend limit, and the total a session may spend cannot exceed " +
	"max_spend_limit from get_status.\n" +
	"- Use signer=\"wallet\" only when the user asks to approve a transaction directly, or for " +
	"/vm.m_addpkg, which sessions can never sign. The user approves each such transaction in Adena. " +
	"This works only when the user has turned on \"Allow master account requests\" in Adena; " +
	"get_status reports it as master_requests_allowed.\n" +
	"- Call revoke_session when the task is done. Session keys live only in this server's memory and " +
	"are lost on restart; revoke such sessions and create new ones.\n" +
	"- Never ask the user for a seed phrase or private key."

func main() {
	if len(os.Args) > 1 && os.Args[1] == "version" {
		fmt.Println(version)

		return
	}

	// On Windows the server runs in a child created protected; this process
	// only waits for it.
	if code, handled := hardening.RunProtected(); handled {
		os.Exit(code)
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
	// create_session refuses to make keys while the report is not full.
	protection := hardening.Apply()
	if !protection.Full() {
		log.Warn("process hardening incomplete", "error", protection.Err())
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

	host := hostInstaller{agentHome: conf.Home}
	host.Sync(context.Background(), log)

	client := &bridge.Client{SocketPath: conf.SocketPath(), VerifyHost: host.VerifyHost}
	if os.Getenv(skipHostCheckEnv) == "1" {
		client.VerifyHost = nil
	}

	registry := server.NewRegistry()
	tools.Register(registry, &tools.Deps{
		Bridge:     client,
		Chain:      chain.NewClient(),
		Host:       host,
		Keys:       keys,
		Store:      store,
		Config:     conf,
		Protection: protection,
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
