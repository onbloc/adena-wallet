package bridge

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"sync"
	"time"
)

// Client calls the extension through the agent host socket. Each call uses
// its own connection, so a Client is safe for concurrent use.
type Client struct {
	SocketPath string
	token      string
	mu         sync.Mutex
}

// SetConnectionToken attaches token to every later request. It lives only in
// this process's memory, so a restarted server has to connect again.
func (c *Client) SetConnectionToken(token string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.token = token
}

func (c *Client) connectionToken() string {
	c.mu.Lock()
	defer c.mu.Unlock()

	return c.token
}

// Call sends one request and decodes the result into out, which may be nil.
// The context bounds the whole exchange, including the user's approval.
func (c *Client) Call(ctx context.Context, method string, params, out any) error {
	request, err := newRequest(method, params)
	if err != nil {
		return err
	}

	request.Token = c.connectionToken()

	line, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("encode request: %w", err)
	}

	if len(line) >= MaxLineSize {
		return &Error{
			Code:    CodeRequestTooLarge,
			Message: fmt.Sprintf("the %s request is %d bytes; it must be under %d", method, len(line), MaxLineSize),
		}
	}

	var dialer net.Dialer

	conn, err := dialer.DialContext(ctx, "unix", c.SocketPath)
	if err != nil {
		return &Error{
			Code: CodeHostUnavailable,
			Message: "cannot reach the Adena agent host; open the browser with Adena and enable " +
				"Settings > Security & Privacy > AI Agent Connection (" + err.Error() + ")",
		}
	}

	defer func() { _ = conn.Close() }()

	// Unblocks the exchange once ctx is done, so ctx.Err() is set by then.
	stop := context.AfterFunc(ctx, func() {
		if deadlineErr := conn.SetDeadline(time.Now()); deadlineErr != nil {
			_ = conn.Close()
		}
	})
	defer stop()

	if _, writeErr := conn.Write(append(line, '\n')); writeErr != nil {
		return fmt.Errorf("send request: %w", writeErr)
	}

	response, err := readResponse(conn, request.ID)
	if err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		return err
	}

	if response.Error != nil {
		return response.Error
	}

	if out == nil || len(response.Result) == 0 {
		return nil
	}

	if err := json.Unmarshal(response.Result, out); err != nil {
		return fmt.Errorf("decode %s result: %w", method, err)
	}

	return nil
}

func newRequest(method string, params any) (Request, error) {
	id := make([]byte, 8)
	if _, err := rand.Read(id); err != nil {
		return Request{}, fmt.Errorf("generate request id: %w", err)
	}

	request := Request{ID: hex.EncodeToString(id), Method: method}

	if params != nil {
		raw, err := json.Marshal(params)
		if err != nil {
			return Request{}, fmt.Errorf("encode params: %w", err)
		}

		request.Params = raw
	}

	return request, nil
}

func readResponse(conn net.Conn, id string) (Response, error) {
	scanner := bufio.NewScanner(conn)
	scanner.Buffer(make([]byte, 0, 4096), MaxLineSize)

	for scanner.Scan() {
		var response Response
		if err := json.Unmarshal(scanner.Bytes(), &response); err != nil {
			return Response{}, fmt.Errorf("decode response: %w", err)
		}

		if response.ID == id {
			return response, nil
		}

		// The host answers without an id only for errors about the connection
		// itself, such as a request it could not read.
		if response.ID == "" && response.Error != nil {
			return Response{}, response.Error
		}
	}

	if err := scanner.Err(); err != nil {
		return Response{}, fmt.Errorf("read response: %w", err)
	}

	return Response{}, errors.New("agent host closed the connection without a response")
}
