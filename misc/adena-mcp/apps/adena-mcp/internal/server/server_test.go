package server

import (
	"context"
	"log/slog"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func connect(t *testing.T, r *Registry) *mcp.ClientSession {
	t.Helper()

	srv := mcp.NewServer(&mcp.Implementation{Name: "test"}, nil)
	if err := r.Publish(srv, slog.New(slog.DiscardHandler)); err != nil {
		t.Fatal(err)
	}

	serverTransport, clientTransport := mcp.NewInMemoryTransports()

	ctx := context.Background()

	serverSession, err := srv.Connect(ctx, serverTransport, nil)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { _ = serverSession.Close() })

	client := mcp.NewClient(&mcp.Implementation{Name: "client"}, nil)

	session, err := client.Connect(ctx, clientTransport, nil)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { _ = session.Close() })

	return session
}

func newTestRegistry() *Registry {
	r := NewRegistry()
	schema := map[string]any{
		"type":       "object",
		"properties": map[string]any{"name": map[string]any{"type": "string"}},
	}

	r.Add(&Tool{
		Name:        "echo",
		InputSchema: schema,
		Handler: func(_ context.Context, args map[string]any) (Result, error) {
			name, err := RequiredStringArg(args, "name")
			if err != nil {
				return Result{}, err
			}

			return Result{Text: "hello " + name, StructuredContent: map[string]any{"name": name}}, nil
		},
	})
	r.Add(&Tool{
		Name:        "boom",
		InputSchema: map[string]any{"type": "object"},
		Handler: func(context.Context, map[string]any) (Result, error) {
			panic("kaboom")
		},
	})

	return r
}

func TestPublishedToolsAreCallable(t *testing.T) {
	t.Parallel()

	session := connect(t, newTestRegistry())
	ctx := context.Background()

	list, err := session.ListTools(ctx, nil)
	if err != nil || len(list.Tools) != 2 {
		t.Fatalf("list tools: %v %v", list, err)
	}

	res, err := session.CallTool(ctx, &mcp.CallToolParams{Name: "echo", Arguments: map[string]any{"name": "adena"}})
	if err != nil {
		t.Fatal(err)
	}

	if res.IsError || res.Content[0].(*mcp.TextContent).Text != "hello adena" {
		t.Fatalf("unexpected result %+v", res)
	}
}

func TestToolErrorsBecomeErrorResults(t *testing.T) {
	t.Parallel()

	session := connect(t, newTestRegistry())

	res, err := session.CallTool(context.Background(), &mcp.CallToolParams{Name: "echo", Arguments: map[string]any{}})
	if err != nil {
		t.Fatal(err)
	}

	structured, ok := res.StructuredContent.(map[string]any)
	if !res.IsError || !ok || structured["error"] != "invalid_argument" {
		t.Fatalf("unexpected result %+v", res)
	}
}

func TestPanicsBecomeErrorResults(t *testing.T) {
	t.Parallel()

	session := connect(t, newTestRegistry())

	res, err := session.CallTool(context.Background(), &mcp.CallToolParams{Name: "boom"})
	if err != nil {
		t.Fatal(err)
	}

	if !res.IsError {
		t.Fatalf("a panic must become an error result, got %+v", res)
	}
}
