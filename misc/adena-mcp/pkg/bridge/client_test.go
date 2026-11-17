package bridge

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"net"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// serveOnce answers the first request on a fresh socket with respond.
func serveOnce(t *testing.T, respond func(Request) Response) string {
	t.Helper()

	path := filepath.Join(t.TempDir(), "s.sock")

	listener, err := net.Listen("unix", path)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { _ = listener.Close() })

	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}

		defer func() { _ = conn.Close() }()

		scanner := bufio.NewScanner(conn)
		if !scanner.Scan() {
			return
		}

		var request Request
		if err := json.Unmarshal(scanner.Bytes(), &request); err != nil {
			return
		}

		line, marshalErr := json.Marshal(respond(request))
		if marshalErr != nil {
			return
		}

		if _, writeErr := conn.Write(append(line, '\n')); writeErr != nil {
			return
		}
	}()

	return path
}

func TestCallDecodesResult(t *testing.T) {
	t.Parallel()

	path := serveOnce(t, func(r Request) Response {
		if r.Method != MethodGetAccount {
			return Response{ID: r.ID, Error: &Error{Code: "invalid_request", Message: r.Method}}
		}

		return Response{ID: r.ID, Result: json.RawMessage(`{"address":"g1abc","chain_id":"dev","rpc_url":"http://x"}`)}
	})

	var account Account
	if err := (&Client{SocketPath: path}).Call(context.Background(), MethodGetAccount, nil, &account); err != nil {
		t.Fatal(err)
	}

	if account.Address != "g1abc" || account.ChainID != "dev" {
		t.Fatalf("unexpected account %+v", account)
	}
}

func TestCallReturnsRemoteError(t *testing.T) {
	t.Parallel()

	path := serveOnce(t, func(r Request) Response {
		return Response{ID: r.ID, Error: &Error{Code: CodeRejected, Message: "user rejected"}}
	})

	err := (&Client{SocketPath: path}).Call(context.Background(), MethodPing, nil, nil)

	var remote *Error
	if !errors.As(err, &remote) || remote.Code != CodeRejected {
		t.Fatalf("got %v, want a rejected error", err)
	}
}

func TestCallReportsMissingHost(t *testing.T) {
	t.Parallel()

	client := &Client{SocketPath: filepath.Join(t.TempDir(), "missing.sock")}
	err := client.Call(context.Background(), MethodPing, nil, nil)

	var remote *Error
	if !errors.As(err, &remote) || remote.Code != CodeHostUnavailable {
		t.Fatalf("got %v, want host_unavailable", err)
	}
}

func TestCallHonorsContextDeadline(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "slow.sock")

	listener, err := net.Listen("unix", path)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { _ = listener.Close() })

	go func() {
		conn, err := listener.Accept()
		if err == nil {
			time.Sleep(time.Second)

			_ = conn.Close()
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	if err := (&Client{SocketPath: path}).Call(ctx, MethodPing, nil, nil); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("got %v, want context.DeadlineExceeded", err)
	}
}

func TestCallRefusesAnOversizedRequest(t *testing.T) {
	t.Parallel()

	client := &Client{SocketPath: filepath.Join(t.TempDir(), "none.sock")}

	params := map[string]string{"body": strings.Repeat("x", MaxLineSize)}
	err := client.Call(context.Background(), MethodSendTransaction, params, nil)

	var remote *Error
	if !errors.As(err, &remote) || remote.Code != CodeRequestTooLarge {
		t.Fatalf("got %v, want request_too_large", err)
	}
}

func TestCommittedHeight(t *testing.T) {
	t.Parallel()

	cases := map[string]int64{``: 0, `null`: 0, `"0"`: 0, `"12"`: 12, `34`: 34, `"x"`: 0}

	for raw, want := range cases {
		result := SessionTxResult{Height: json.RawMessage(raw)}
		if got := result.CommittedHeight(); got != want {
			t.Errorf("%q: got %d, want %d", raw, got, want)
		}
	}
}

func TestCallSendsTheConnectionToken(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "s.sock")

	listener, err := net.Listen("unix", path)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { _ = listener.Close() })

	got := make(chan Request, 1)

	go func() {
		conn, acceptErr := listener.Accept()
		if acceptErr != nil {
			return
		}

		defer func() { _ = conn.Close() }()

		var request Request
		if json.NewDecoder(conn).Decode(&request) == nil {
			got <- request

			response := Response{ID: request.ID, Result: json.RawMessage(`{}`)}
			if encodeErr := json.NewEncoder(conn).Encode(response); encodeErr != nil {
				return
			}
		}
	}()

	client := &Client{SocketPath: path}
	client.SetConnectionToken("tok")

	if err := client.Call(context.Background(), MethodPing, nil, nil); err != nil {
		t.Fatal(err)
	}

	if request := <-got; request.Token != "tok" {
		t.Fatalf("got token %q", request.Token)
	}
}
