// Package relay forwards agent requests from the host socket to the Adena
// extension over native messaging and routes the responses back.
package relay

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/agentpath"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/nativemsg"
)

const (
	socketPerm       = 0o600
	probeTimeout     = 500 * time.Millisecond
	maxClientRequest = 64 << 10
)

// ErrHostRunning means another host already serves the socket, typically
// for a second browser profile.
var ErrHostRunning = errors.New("another agent host is already listening")

// Listen opens the host socket, replacing a stale socket file left by a host
// that did not shut down cleanly.
func Listen(socketPath string) (net.Listener, error) {
	if err := agentpath.EnsureDir(filepath.Dir(socketPath)); err != nil {
		return nil, err
	}

	if _, err := os.Stat(socketPath); err == nil {
		conn, dialErr := net.DialTimeout("unix", socketPath, probeTimeout)
		if dialErr == nil {
			_ = conn.Close()

			return nil, ErrHostRunning
		}

		if err := os.Remove(socketPath); err != nil {
			return nil, fmt.Errorf("remove stale socket: %w", err)
		}
	}

	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		return nil, fmt.Errorf("listen on %s: %w", socketPath, err)
	}

	if err := os.Chmod(socketPath, socketPerm); err != nil {
		_ = listener.Close()

		return nil, fmt.Errorf("chmod socket: %w", err)
	}

	return listener, nil
}

type client struct {
	conn net.Conn
	mu   sync.Mutex
}

func (c *client) send(response bridge.Response) {
	line, err := json.Marshal(response)
	if err != nil {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	// A client that stopped reading is dropped; its reader loop then exits.
	if _, err := c.conn.Write(append(line, '\n')); err != nil {
		_ = c.conn.Close()
	}
}

type pendingCall struct {
	client *client
	id     string
}

// Relay connects socket clients to one browser native messaging channel.
type Relay struct {
	browserIn  io.Reader
	browserOut io.Writer
	listener   net.Listener
	log        *slog.Logger
	pending    map[string]pendingCall
	clients    map[*client]struct{}
	seq        uint64
	outMu      sync.Mutex
	mu         sync.Mutex
}

// New creates a relay between the browser streams and the socket listener.
func New(browserIn io.Reader, browserOut io.Writer, listener net.Listener, log *slog.Logger) *Relay {
	return &Relay{
		browserIn:  browserIn,
		browserOut: browserOut,
		listener:   listener,
		log:        log,
		pending:    make(map[string]pendingCall),
		clients:    make(map[*client]struct{}),
	}
}

// Run serves until the browser closes the native messaging channel or ctx
// is canceled. Outstanding requests fail with extension_disconnected.
func (r *Relay) Run(ctx context.Context) error {
	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	stop := context.AfterFunc(runCtx, func() { _ = r.listener.Close() })
	defer stop()

	var workers sync.WaitGroup

	workers.Go(r.acceptLoop)

	err := r.browserLoop()

	_ = r.listener.Close()

	r.failAll()
	workers.Wait()

	return err
}

func (r *Relay) acceptLoop() {
	var handlers sync.WaitGroup
	defer handlers.Wait()

	for {
		conn, err := r.listener.Accept()
		if err != nil {
			return
		}

		c := &client{conn: conn}

		r.mu.Lock()
		r.clients[c] = struct{}{}
		r.mu.Unlock()

		handlers.Go(func() { r.serveClient(c) })
	}
}

func (r *Relay) serveClient(c *client) {
	defer r.dropClient(c)

	scanner := bufio.NewScanner(c.conn)
	scanner.Buffer(make([]byte, 0, 4096), maxClientRequest)

	for scanner.Scan() {
		var request bridge.Request
		if err := json.Unmarshal(scanner.Bytes(), &request); err != nil || request.ID == "" {
			c.send(bridge.Response{Error: &bridge.Error{Code: "invalid_request", Message: "malformed request"}})

			continue
		}

		r.forward(c, request)
	}
}

func (r *Relay) forward(c *client, request bridge.Request) {
	r.mu.Lock()
	r.seq++
	hostID := strconv.FormatUint(r.seq, 10)
	r.pending[hostID] = pendingCall{client: c, id: request.ID}
	r.mu.Unlock()

	originalID := request.ID
	request.ID = hostID

	message, err := json.Marshal(request)
	if err == nil {
		r.outMu.Lock()
		err = nativemsg.Write(r.browserOut, message)
		r.outMu.Unlock()
	}

	if err != nil {
		r.mu.Lock()
		delete(r.pending, hostID)
		r.mu.Unlock()

		c.send(bridge.Response{
			ID:    originalID,
			Error: &bridge.Error{Code: bridge.CodeExtensionGone, Message: err.Error()},
		})
	}
}

func (r *Relay) browserLoop() error {
	for {
		message, err := nativemsg.Read(r.browserIn)
		if err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}

			return fmt.Errorf("read from browser: %w", err)
		}

		var response bridge.Response
		if err := json.Unmarshal(message, &response); err != nil {
			r.log.Warn("ignoring malformed browser message", "error", err)

			continue
		}

		r.mu.Lock()
		call, ok := r.pending[response.ID]
		delete(r.pending, response.ID)
		r.mu.Unlock()

		if !ok {
			continue
		}

		response.ID = call.id
		call.client.send(response)
	}
}

func (r *Relay) dropClient(c *client) {
	r.mu.Lock()
	delete(r.clients, c)

	for id, call := range r.pending {
		if call.client == c {
			delete(r.pending, id)
		}
	}
	r.mu.Unlock()

	_ = c.conn.Close()
}

func (r *Relay) failAll() {
	r.mu.Lock()
	pending := r.pending
	clients := r.clients
	r.pending = make(map[string]pendingCall)
	r.clients = make(map[*client]struct{})
	r.mu.Unlock()

	for _, call := range pending {
		call.client.send(bridge.Response{
			ID:    call.id,
			Error: &bridge.Error{Code: bridge.CodeExtensionGone, Message: "the browser closed the connection"},
		})
	}

	for c := range clients {
		_ = c.conn.Close()
	}
}
