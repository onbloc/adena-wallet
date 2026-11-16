package relay

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bridge"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/nativemsg"
)

type harness struct {
	toHost     *io.PipeWriter
	fromHost   *io.PipeReader
	done       chan error
	cancel     context.CancelFunc
	requestsCh chan bridge.Request
	socket     string
}

// newHarness starts a relay whose browser side is driven by the test.
func newHarness(t *testing.T) *harness {
	t.Helper()

	dir, err := os.MkdirTemp("", "relay")
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	socket := filepath.Join(dir, "a.sock")

	listener, err := Listen(socket)
	if err != nil {
		t.Fatal(err)
	}

	browserIn, toHost := io.Pipe()
	fromHost, browserOut := io.Pipe()

	ctx, cancel := context.WithCancel(context.Background())
	h := &harness{
		socket:     socket,
		toHost:     toHost,
		fromHost:   fromHost,
		done:       make(chan error, 1),
		cancel:     cancel,
		requestsCh: make(chan bridge.Request, 8),
	}

	relay := New(browserIn, browserOut, listener, slog.New(slog.DiscardHandler))

	go func() { h.done <- relay.Run(ctx) }()
	go func() {
		for {
			message, err := nativemsg.Read(fromHost)
			if err != nil {
				return
			}

			var request bridge.Request
			if json.Unmarshal(message, &request) == nil {
				h.requestsCh <- request
			}
		}
	}()

	t.Cleanup(func() {
		cancel()

		_ = toHost.Close()
		_ = browserOut.Close()
	})

	return h
}

func (h *harness) reply(t *testing.T, response bridge.Response) {
	t.Helper()

	message, err := json.Marshal(response)
	if err != nil {
		t.Fatal(err)
	}

	if err := nativemsg.Write(h.toHost, message); err != nil {
		t.Fatal(err)
	}
}

func (h *harness) nextRequest(t *testing.T) bridge.Request {
	t.Helper()

	select {
	case request := <-h.requestsCh:
		return request
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for a forwarded request")

		return bridge.Request{}
	}
}

func TestRelayRoutesResponseToCaller(t *testing.T) {
	t.Parallel()

	h := newHarness(t)
	client := &bridge.Client{SocketPath: h.socket}

	result := make(chan error, 1)

	var account bridge.Account

	go func() {
		result <- client.Call(context.Background(), bridge.MethodGetAccount, nil, &account)
	}()

	request := h.nextRequest(t)
	if request.Method != bridge.MethodGetAccount {
		t.Fatalf("got method %q", request.Method)
	}

	h.reply(t, bridge.Response{ID: "unknown", Result: json.RawMessage(`{}`)})
	h.reply(t, bridge.Response{ID: request.ID, Result: json.RawMessage(`{"address":"g1xyz"}`)})

	if err := <-result; err != nil {
		t.Fatal(err)
	}

	if account.Address != "g1xyz" {
		t.Fatalf("got %+v", account)
	}
}

func TestRelayFailsPendingCallsWhenBrowserCloses(t *testing.T) {
	t.Parallel()

	h := newHarness(t)
	client := &bridge.Client{SocketPath: h.socket}

	result := make(chan error, 1)

	go func() {
		result <- client.Call(context.Background(), bridge.MethodPing, nil, nil)
	}()

	h.nextRequest(t)
	_ = h.toHost.Close()

	var remote *bridge.Error
	if err := <-result; !errors.As(err, &remote) || remote.Code != bridge.CodeExtensionGone {
		t.Fatalf("got %v, want extension_disconnected", err)
	}

	if err := <-h.done; err != nil {
		t.Fatalf("relay returned %v", err)
	}
}

func TestListenRejectsSecondHost(t *testing.T) {
	t.Parallel()

	h := newHarness(t)

	if _, err := Listen(h.socket); !errors.Is(err, ErrHostRunning) {
		t.Fatalf("got %v, want ErrHostRunning", err)
	}
}

func TestListenReplacesStaleSocket(t *testing.T) {
	t.Parallel()

	dir, err := os.MkdirTemp("", "relay")
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	socket := filepath.Join(dir, "a.sock")
	if writeErr := os.WriteFile(socket, nil, 0o600); writeErr != nil {
		t.Fatal(writeErr)
	}

	listener, err := Listen(socket)
	if err != nil {
		t.Fatal(err)
	}

	_ = listener.Close()
}
