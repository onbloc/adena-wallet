package relay

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
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
		requestsCh: make(chan bridge.Request, 64),
	}

	relay := New(browserIn, browserOut, listener, slog.New(slog.DiscardHandler))
	relay.Info = bridge.HostInfo{Version: "test", Browser: "Test Browser", ExtensionID: "abc"}

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

func dialRaw(t *testing.T, socket string) net.Conn {
	t.Helper()

	conn, err := net.Dial("unix", socket)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { _ = conn.Close() })

	return conn
}

func writeLine(t *testing.T, conn net.Conn, line string) {
	t.Helper()

	if _, err := conn.Write([]byte(line + "\n")); err != nil {
		t.Fatal(err)
	}
}

func TestRelaySetsPeerFromTheOS(t *testing.T) {
	t.Parallel()

	h := newHarness(t)
	conn := dialRaw(t, h.socket)

	writeLine(t, conn, `{"id":"1","method":"ping","peer":{"pid":1,"exe":"/forged"}}`)

	request := h.nextRequest(t)

	if runtime.GOOS != "darwin" && runtime.GOOS != "linux" {
		if request.Peer != nil {
			t.Fatalf("got peer %+v, want none", request.Peer)
		}

		return
	}

	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}

	if request.Peer == nil || request.Peer.PID != os.Getpid() || request.Peer.Start == "" {
		t.Fatalf("got peer %+v, want pid %d with a start time", request.Peer, os.Getpid())
	}

	want, err := filepath.EvalSymlinks(exe)
	if err != nil {
		t.Fatal(err)
	}

	got, err := filepath.EvalSymlinks(request.Peer.Exe)
	if err != nil {
		t.Fatalf("peer exe %q: %v", request.Peer.Exe, err)
	}

	if got != want {
		t.Fatalf("got exe %q, want %q", request.Peer.Exe, exe)
	}
}

func TestRelayAnswersHostInfoItself(t *testing.T) {
	t.Parallel()

	h := newHarness(t)
	conn := dialRaw(t, h.socket)

	writeLine(t, conn, `{"id":"7","method":"host_info"}`)

	var response bridge.Response
	if err := json.NewDecoder(conn).Decode(&response); err != nil {
		t.Fatal(err)
	}

	var info bridge.HostInfo
	if response.ID != "7" || response.Error != nil || json.Unmarshal(response.Result, &info) != nil {
		t.Fatalf("unexpected response %+v", response)
	}

	if info.Browser != "Test Browser" || info.ExtensionID != "abc" {
		t.Fatalf("unexpected info %+v", info)
	}

	select {
	case request := <-h.requestsCh:
		t.Fatalf("host_info must not reach the extension, forwarded %+v", request)
	case <-time.After(100 * time.Millisecond):
	}
}

func TestRelayRefusesCancelFromClients(t *testing.T) {
	t.Parallel()

	h := newHarness(t)
	conn := dialRaw(t, h.socket)

	writeLine(t, conn, `{"id":"1","method":"cancel","params":{"request_id":"1"}}`)

	var response bridge.Response
	if err := json.NewDecoder(conn).Decode(&response); err != nil {
		t.Fatal(err)
	}

	if response.Error == nil || response.Error.Code != "invalid_request" {
		t.Fatalf("got %+v, want invalid_request", response)
	}

	select {
	case request := <-h.requestsCh:
		t.Fatalf("forwarded %+v", request)
	case <-time.After(100 * time.Millisecond):
	}
}

func TestRelayCancelsRequestsOfAClosedConnection(t *testing.T) {
	t.Parallel()

	h := newHarness(t)
	conn := dialRaw(t, h.socket)

	writeLine(t, conn, `{"id":"a","method":"create_session"}`)

	forwarded := h.nextRequest(t)
	_ = conn.Close()

	cancel := h.nextRequest(t)
	if cancel.Method != bridge.MethodCancel {
		t.Fatalf("got method %q, want cancel", cancel.Method)
	}

	var params bridge.CancelParams
	if err := json.Unmarshal(cancel.Params, &params); err != nil {
		t.Fatal(err)
	}

	if params.RequestID != forwarded.ID {
		t.Fatalf("cancel names %q, want %q", params.RequestID, forwarded.ID)
	}
}

func TestRelaySlowClientDoesNotBlockOthers(t *testing.T) {
	t.Parallel()

	h := newHarness(t)
	stalled := dialRaw(t, h.socket)

	ids := make([]string, 0, maxPendingCalls)

	for i := range maxPendingCalls {
		writeLine(t, stalled, `{"id":"s`+strconv.Itoa(i)+`","method":"ping"}`)
		ids = append(ids, h.nextRequest(t).ID)
	}

	// Large results fill the stalled client's socket buffer and queue.
	big := json.RawMessage(`{"pad":"` + strings.Repeat("x", 512<<10) + `"}`)
	for _, id := range ids {
		h.reply(t, bridge.Response{ID: id, Result: big})
	}

	client := &bridge.Client{SocketPath: h.socket}
	result := make(chan error, 1)

	go func() { result <- client.Call(context.Background(), bridge.MethodPing, nil, nil) }()

	h.reply(t, bridge.Response{ID: h.nextRequest(t).ID, Result: json.RawMessage(`{}`)})

	select {
	case err := <-result:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("a stalled client blocked another client's response")
	}
}

func TestRelayForwardsRequestsUpToTheSharedLimit(t *testing.T) {
	t.Parallel()

	h := newHarness(t)
	client := &bridge.Client{SocketPath: h.socket}
	body := strings.Repeat("x", 70<<10)

	result := make(chan error, 1)

	go func() {
		result <- client.Call(context.Background(), bridge.MethodSendTransaction, map[string]string{"body": body}, nil)
	}()

	h.reply(t, bridge.Response{ID: h.nextRequest(t).ID, Result: json.RawMessage(`{}`)})

	if err := <-result; err != nil {
		t.Fatal(err)
	}
}

func TestRelayExplainsAnOversizedRequest(t *testing.T) {
	t.Parallel()

	h := newHarness(t)
	conn := dialRaw(t, h.socket)

	line := `{"id":"1","method":"ping","params":{"body":"` + strings.Repeat("x", bridge.MaxLineSize) + `"}}`

	written := make(chan error, 1)

	go func() {
		_, err := conn.Write([]byte(line + "\n"))
		written <- err
	}()

	var response bridge.Response
	if err := json.NewDecoder(conn).Decode(&response); err != nil {
		t.Fatal(err)
	}

	if response.Error == nil || response.Error.Code != bridge.CodeRequestTooLarge {
		t.Fatalf("got %+v, want request_too_large", response)
	}
}

func TestRelayStopsOnCancelWhileTheBrowserStaysOpen(t *testing.T) {
	t.Parallel()

	h := newHarness(t)
	client := &bridge.Client{SocketPath: h.socket}

	result := make(chan error, 1)

	go func() { result <- client.Call(context.Background(), bridge.MethodPing, nil, nil) }()

	h.nextRequest(t)

	// The browser side stays open and silent; only the signal context ends.
	h.cancel()

	select {
	case err := <-h.done:
		if err != nil {
			t.Fatalf("relay returned %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Run did not return after cancellation while the browser channel was open")
	}

	var remote *bridge.Error
	if err := <-result; !errors.As(err, &remote) || remote.Code != bridge.CodeExtensionGone {
		t.Fatalf("pending call got %v, want extension_disconnected", err)
	}
}
