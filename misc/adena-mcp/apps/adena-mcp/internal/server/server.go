// Package server holds the declarative tool registry and adapts it to the MCP
// SDK, following the gno-mcp layout: tools return a Result or a ToolError, and
// the adapter turns both into MCP tool results.
package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"runtime/debug"
	"sort"
	"sync"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// Annotations are MCP tool hints.
type Annotations struct {
	ReadOnly    bool
	Destructive bool
	Idempotent  bool
	OpenWorld   bool
}

// Result is a successful tool outcome.
type Result struct {
	StructuredContent map[string]any
	Text              string
}

// ToolError is a tool failure the agent can act on. Code is stable, Message
// explains the repair, and Extra is merged into the structured content.
type ToolError struct {
	Extra   map[string]any
	Code    string
	Message string
}

func (e *ToolError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

type clientNameKey struct{}

// WithClientName attaches the MCP client's name to ctx.
func WithClientName(ctx context.Context, name string) context.Context {
	return context.WithValue(ctx, clientNameKey{}, name)
}

// ClientName returns the MCP client's self-reported name, such as
// "claude-code", or "" when the client sent none.
func ClientName(ctx context.Context) string {
	name, _ := ctx.Value(clientNameKey{}).(string)

	return name
}

// Handler executes a tool with decoded JSON arguments.
type Handler func(ctx context.Context, args map[string]any) (Result, error)

// Tool is the declarative shape of an MCP tool.
type Tool struct {
	InputSchema map[string]any
	Handler     Handler
	Name        string
	Description string
	Annotations Annotations
}

// Registry holds the declared tools.
type Registry struct {
	tools map[string]*Tool
	mu    sync.RWMutex
}

// NewRegistry returns an empty registry.
func NewRegistry() *Registry {
	return &Registry{tools: make(map[string]*Tool)}
}

// Add registers t, replacing a tool with the same name.
func (r *Registry) Add(t *Tool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.tools[t.Name] = t
}

// All returns the tools sorted by name.
func (r *Registry) All() []*Tool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	tools := make([]*Tool, 0, len(r.tools))
	for _, t := range r.tools {
		tools = append(tools, t)
	}

	sort.Slice(tools, func(i, j int) bool { return tools[i].Name < tools[j].Name })

	return tools
}

// Publish registers every tool with the MCP server.
func (r *Registry) Publish(m *mcp.Server, log *slog.Logger) error {
	for _, t := range r.All() {
		schema, err := toSchema(t.InputSchema)
		if err != nil {
			return fmt.Errorf("tool %q: %w", t.Name, err)
		}

		m.AddTool(&mcp.Tool{
			Name:        t.Name,
			Description: t.Description,
			InputSchema: schema,
			Annotations: toAnnotations(t.Annotations),
		}, adapt(t, log))
	}

	return nil
}

func toSchema(m map[string]any) (*jsonschema.Schema, error) {
	raw, err := json.Marshal(m)
	if err != nil {
		return nil, fmt.Errorf("encode schema: %w", err)
	}

	var schema jsonschema.Schema
	if err := json.Unmarshal(raw, &schema); err != nil {
		return nil, fmt.Errorf("decode schema: %w", err)
	}

	return &schema, nil
}

func toAnnotations(a Annotations) *mcp.ToolAnnotations {
	destructive := a.Destructive
	openWorld := a.OpenWorld

	return &mcp.ToolAnnotations{
		ReadOnlyHint:    a.ReadOnly,
		DestructiveHint: &destructive,
		IdempotentHint:  a.Idempotent,
		OpenWorldHint:   &openWorld,
	}
}

// adapt converts a Tool into an SDK handler. The SDK runs handlers without a
// recover, so a panic here would end the server; it becomes a tool error.
func adapt(t *Tool, log *slog.Logger) mcp.ToolHandler {
	//nolint:nonamedreturns // the deferred recover replaces the result
	return func(ctx context.Context, req *mcp.CallToolRequest) (result *mcp.CallToolResult, err error) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Error("tool panicked", "tool", t.Name, "panic", rec, "stack", string(debug.Stack()))

				result = textResult(fmt.Sprintf("tool %q panicked: %v", t.Name, rec), true)
				err = nil
			}
		}()

		args := map[string]any{}

		if req.Params != nil && len(req.Params.Arguments) > 0 {
			if decodeErr := json.Unmarshal(req.Params.Arguments, &args); decodeErr != nil {
				return textResult("invalid arguments: "+decodeErr.Error(), true), nil
			}
		}

		if req.Session != nil {
			if params := req.Session.InitializeParams(); params != nil && params.ClientInfo != nil {
				ctx = WithClientName(ctx, params.ClientInfo.Name)
			}
		}

		res, callErr := t.Handler(ctx, args)
		if callErr != nil {
			return errorResult(callErr), nil
		}

		out := textResult(res.Text, false)
		if len(res.StructuredContent) > 0 {
			out.StructuredContent = res.StructuredContent
		}

		return out, nil
	}
}

func textResult(text string, isError bool) *mcp.CallToolResult {
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: text}},
		IsError: isError,
	}
}

func errorResult(err error) *mcp.CallToolResult {
	var te *ToolError
	if !errors.As(err, &te) {
		return textResult(err.Error(), true)
	}

	structured := map[string]any{"error": te.Code, "message": te.Message}
	for k, v := range te.Extra {
		structured[k] = v
	}

	out := textResult(fmt.Sprintf("[%s] %s", te.Code, te.Message), true)
	out.StructuredContent = structured

	return out
}
