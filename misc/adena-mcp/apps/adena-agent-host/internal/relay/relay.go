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
	socketPerm   = 0o600
	probeTimeout = 500 * time.Millisecond
	// A client that does not read its responses for this long is dropped, so
	// it cannot stall responses to everyone else.
	clientWriteTimeout = 5 * time.Second
	clientQueueSize    = 16
	maxClients         = 32
	maxPendingCalls    = 16
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

	if err := clearSocket(socketPath); err != nil {
		return nil, err
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

// clearSocket removes a socket file nobody serves, or one another user owns:
// such a socket may still have that user's listener behind it, so it is
// replaced instead of probed. A live socket of this user means another host
// already serves agents.
func clearSocket(socketPath string) error {
	if _, err := os.Stat(socketPath); errors.Is(err, os.ErrNotExist) {
		return nil
	} else if err != nil {
		return fmt.Errorf("stat socket: %w", err)
	}

	owned, err := agentpath.IsOwnedByUser(socketPath)
	if err != nil {
		return fmt.Errorf("check socket owner: %w", err)
	}

	if owned {
		if conn, dialErr := net.DialTimeout("unix", socketPath, probeTimeout); dialErr == nil {
			_ = conn.Close()

			return ErrHostRunning
		}
	}

	if err := os.Remove(socketPath); err != nil {
		return fmt.Errorf("remove stale socket: %w", err)
	}

	return nil
}

type client struct {
	conn    net.Conn
	peer    *bridge.Peer
	out     chan []byte
	done    chan struct{}
	once    sync.Once
	pending int
}

func newClient(conn net.Conn, peer *bridge.Peer) *client {
	return &client{conn: conn, peer: peer, out: make(chan []byte, clientQueueSize), done: make(chan struct{})}
}

// send queues a response without blocking; a client whose queue is full has
// stopped reading and is dropped.
func (c *client) send(response bridge.Response) {
	line, err := json.Marshal(response)
	if err != nil {
		return
	}

	select {
	case <-c.done:
	case c.out <- append(line, '\n'):
	default:
		c.close()
	}
}

// sendNow writes a response directly, for the final responses written right
// before the connection closes.
func (c *client) sendNow(response bridge.Response) {
	line, err := json.Marshal(response)
	if err != nil {
		return
	}

	if c.conn.SetWriteDeadline(time.Now().Add(clientWriteTimeout)) != nil {
		return
	}

	if _, err := c.conn.Write(append(line, '\n')); err != nil {
		c.close()
	}
}

func (c *client) writeLoop() {
	for {
		select {
		case <-c.done:
			return
		case line := <-c.out:
			if err := c.conn.SetWriteDeadline(time.Now().Add(clientWriteTimeout)); err != nil {
				c.close()

				return
			}

			if _, err := c.conn.Write(line); err != nil {
				c.close()

				return
			}
		}
	}
}

func (c *client) close() {
	c.once.Do(func() {
		close(c.done)
		_ = c.conn.Close()
	})
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
	cancelSeq  uint64
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

	// A read from the browser cannot be interrupted, so cancellation does not
	// wait for it: the reader is left behind and cleanup runs now. The process
	// exits right after Run returns.
	browserDone := make(chan error, 1)

	go func() { browserDone <- r.browserLoop() }()

	var err error

	select {
	case err = <-browserDone:
	case <-runCtx.Done():
	}

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

		peer, err := peerOf(conn)
		if err != nil {
			r.log.Warn("refusing agent connection", "error", err)

			_ = conn.Close()

			continue
		}

		c := newClient(conn, peer)

		r.mu.Lock()

		full := len(r.clients) >= maxClients
		if !full {
			r.clients[c] = struct{}{}
		}
		r.mu.Unlock()

		if full {
			r.log.Warn("refusing agent connection", "error", "too many connections")

			_ = conn.Close()

			continue
		}

		handlers.Go(c.writeLoop)
		handlers.Go(func() { r.serveClient(c) })
	}
}

func (r *Relay) serveClient(c *client) {
	defer r.dropClient(c)

	scanner := bufio.NewScanner(c.conn)
	// The shared limit, so wallet requests carrying package sources fit.
	scanner.Buffer(make([]byte, 0, 4096), bridge.MaxLineSize)

	for scanner.Scan() {
		var request bridge.Request
		if err := json.Unmarshal(scanner.Bytes(), &request); err != nil || request.ID == "" {
			c.send(bridge.Response{Error: &bridge.Error{Code: "invalid_request", Message: "malformed request"}})

			continue
		}

		// Only the host cancels, so one agent cannot close another's approval.
		if request.Method == bridge.MethodCancel {
			c.send(bridge.Response{
				ID:    request.ID,
				Error: &bridge.Error{Code: "invalid_request", Message: "cancel is reserved for the host"},
			})

			continue
		}

		r.forward(c, request)
	}

	// Tell the client why it is being dropped instead of only closing.
	if errors.Is(scanner.Err(), bufio.ErrTooLong) {
		c.sendNow(bridge.Response{Error: &bridge.Error{
			Code:    bridge.CodeRequestTooLarge,
			Message: fmt.Sprintf("a request line must be under %d bytes", bridge.MaxLineSize),
		}})
	}
}

func (r *Relay) forward(c *client, request bridge.Request) {
	r.mu.Lock()
	if c.pending >= maxPendingCalls {
		r.mu.Unlock()
		c.send(bridge.Response{
			ID:    request.ID,
			Error: &bridge.Error{Code: "too_many_requests", Message: "too many requests are in flight on this connection"},
		})

		return
	}

	c.pending++
	r.seq++
	hostID := strconv.FormatUint(r.seq, 10)
	r.pending[hostID] = pendingCall{client: c, id: request.ID}
	r.mu.Unlock()

	originalID := request.ID
	request.ID = hostID
	// The extension trusts this field, so it always comes from the host.
	request.Peer = c.peer

	err := r.writeBrowser(request)
	if err != nil {
		r.mu.Lock()
		if _, ok := r.pending[hostID]; ok {
			delete(r.pending, hostID)

			c.pending--
		}
		r.mu.Unlock()

		code := bridge.CodeExtensionGone
		if errors.Is(err, nativemsg.ErrMessageTooLarge) {
			code = bridge.CodeRequestTooLarge
		}

		c.send(bridge.Response{ID: originalID, Error: &bridge.Error{Code: code, Message: err.Error()}})
	}
}

func (r *Relay) writeBrowser(request bridge.Request) error {
	message, err := json.Marshal(request)
	if err != nil {
		return err
	}

	r.outMu.Lock()
	defer r.outMu.Unlock()

	return nativemsg.Write(r.browserOut, message)
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
		if ok {
			delete(r.pending, response.ID)

			call.client.pending--
		}
		r.mu.Unlock()

		if !ok {
			continue
		}

		response.ID = call.id
		call.client.send(response)
	}
}

// dropClient forgets a closed connection and asks Adena to cancel what it
// still waits for, so a late approval cannot act for an agent that gave up.
func (r *Relay) dropClient(c *client) {
	r.mu.Lock()
	delete(r.clients, c)

	var abandoned []string

	for id, call := range r.pending {
		if call.client == c {
			delete(r.pending, id)
			abandoned = append(abandoned, id)
		}
	}

	c.pending = 0
	r.mu.Unlock()

	c.close()

	for _, id := range abandoned {
		r.cancel(id)
	}
}

func (r *Relay) cancel(hostID string) {
	r.mu.Lock()
	r.cancelSeq++
	id := "cancel-" + strconv.FormatUint(r.cancelSeq, 10)
	r.mu.Unlock()

	params, err := json.Marshal(bridge.CancelParams{RequestID: hostID})
	if err != nil {
		return
	}

	if err := r.writeBrowser(bridge.Request{ID: id, Method: bridge.MethodCancel, Params: params}); err != nil {
		r.log.Warn("could not cancel an abandoned request", "error", err)
	}
}

func (r *Relay) failAll() {
	r.mu.Lock()
	pending := r.pending
	clients := r.clients
	r.pending = make(map[string]pendingCall)
	r.clients = make(map[*client]struct{})
	r.mu.Unlock()

	for _, call := range pending {
		call.client.sendNow(bridge.Response{
			ID:    call.id,
			Error: &bridge.Error{Code: bridge.CodeExtensionGone, Message: "the browser closed the connection"},
		})
	}

	for c := range clients {
		c.close()
	}
}
