package tools

import (
	"encoding/json"
	"fmt"

	"github.com/gnolang/gno/gno.land/pkg/sdk/vm"
	"github.com/gnolang/gno/tm2/pkg/crypto"
	"github.com/gnolang/gno/tm2/pkg/sdk/bank"
	"github.com/gnolang/gno/tm2/pkg/std"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/server"
	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/session"
)

// Message types, as Adena names them.
const (
	msgCall   = "/vm.m_call"
	msgRun    = "/vm.m_run"
	msgAddPkg = "/vm.m_addpkg"
	msgSend   = "/bank.MsgSend"
)

const maxMessages = 32

// txMessage is one message as the agent sent it, with what session matching
// needs. route is empty for messages a session can never sign.
type txMessage struct {
	typ     string
	route   string
	pkgPath string
	raw     json.RawMessage
	value   json.RawMessage
}

// messageError is a message that cannot be turned into a chain message.
type messageError struct {
	msg string
}

func (e *messageError) Error() string { return e.msg }

type memFile struct {
	Name string `json:"name"`
	Body string `json:"body"`
}

type memPackage struct {
	Name  string    `json:"name"`
	Path  string    `json:"path"`
	Files []memFile `json:"files"`
}

type callValue struct {
	Caller     string   `json:"caller"`
	Send       string   `json:"send"`
	MaxDeposit string   `json:"max_deposit"`
	PkgPath    string   `json:"pkg_path"`
	Func       string   `json:"func"`
	Args       []string `json:"args"`
}

type runValue struct {
	Package    *memPackage `json:"package"`
	Caller     string      `json:"caller"`
	Send       string      `json:"send"`
	MaxDeposit string      `json:"max_deposit"`
}

type sendValue struct {
	FromAddress string `json:"from_address"`
	ToAddress   string `json:"to_address"`
	Amount      string `json:"amount"`
}

func parseMessages(v any) ([]txMessage, error) {
	items, ok := v.([]any)
	if !ok || len(items) == 0 {
		return nil, server.InvalidArg("messages", "must be a non-empty array")
	}

	if len(items) > maxMessages {
		return nil, server.InvalidArg("messages", fmt.Sprintf("at most %d messages are allowed", maxMessages))
	}

	out := make([]txMessage, 0, len(items))

	for i, item := range items {
		raw, err := json.Marshal(item)
		if err != nil {
			return nil, server.InvalidArg(fmt.Sprintf("messages[%d]", i), err.Error())
		}

		var envelope struct {
			Type  string          `json:"type"`
			Value json.RawMessage `json:"value"`
		}

		if err := json.Unmarshal(raw, &envelope); err != nil || len(envelope.Value) == 0 {
			return nil, server.InvalidArg(fmt.Sprintf("messages[%d]", i), "must be an object with type and value")
		}

		m := txMessage{typ: envelope.Type, raw: raw, value: envelope.Value}

		switch envelope.Type {
		case msgCall:
			var call callValue
			if err := json.Unmarshal(envelope.Value, &call); err != nil || call.PkgPath == "" || call.Func == "" {
				return nil, server.InvalidArg(fmt.Sprintf("messages[%d]", i), "a call needs pkg_path and func")
			}

			m.route, m.pkgPath = session.RouteExec, call.PkgPath
		case msgRun:
			m.route = session.RouteRun
		case msgSend:
			m.route = session.RouteSend
		case msgAddPkg:
			// Sessions can never deploy packages; only the wallet signs these.
		default:
			return nil, server.InvalidArg(fmt.Sprintf("messages[%d].type", i), "unsupported type "+envelope.Type)
		}

		out = append(out, m)
	}

	return out, nil
}

// buildSessionMsgs converts the messages for session signing, with master as
// the signer. A signer field naming any other account is refused.
func buildSessionMsgs(messages []txMessage, master crypto.Address) ([]std.Msg, error) {
	out := make([]std.Msg, 0, len(messages))

	for i, m := range messages {
		msg, err := buildSessionMsg(m, master)
		if err != nil {
			return nil, &messageError{msg: fmt.Sprintf("messages[%d]: %v", i, err)}
		}

		out = append(out, msg)
	}

	return out, nil
}

func buildSessionMsg(m txMessage, master crypto.Address) (std.Msg, error) {
	switch m.typ {
	case msgCall:
		var v callValue
		if err := json.Unmarshal(m.value, &v); err != nil {
			return nil, err
		}

		if err := checkSigner(v.Caller, master); err != nil {
			return nil, err
		}

		send, maxDeposit, err := parseCoinPair(v.Send, v.MaxDeposit)
		if err != nil {
			return nil, err
		}

		return vm.MsgCall{
			Caller: master, Send: send, MaxDeposit: maxDeposit, PkgPath: v.PkgPath, Func: v.Func, Args: v.Args,
		}, nil
	case msgRun:
		var v runValue
		if err := json.Unmarshal(m.value, &v); err != nil {
			return nil, err
		}

		if err := checkSigner(v.Caller, master); err != nil {
			return nil, err
		}

		if v.Package == nil || len(v.Package.Files) == 0 {
			return nil, fmt.Errorf("package with at least one file is required")
		}

		send, maxDeposit, err := parseCoinPair(v.Send, v.MaxDeposit)
		if err != nil {
			return nil, err
		}

		files := make([]*std.MemFile, 0, len(v.Package.Files))
		for _, f := range v.Package.Files {
			files = append(files, &std.MemFile{Name: f.Name, Body: f.Body})
		}

		// The handler fills in the ephemeral package path.
		return vm.MsgRun{
			Caller:     master,
			Send:       send,
			MaxDeposit: maxDeposit,
			Package:    &std.MemPackage{Name: "main", Files: files},
		}, nil
	case msgSend:
		var v sendValue
		if err := json.Unmarshal(m.value, &v); err != nil {
			return nil, err
		}

		if err := checkSigner(v.FromAddress, master); err != nil {
			return nil, err
		}

		to, err := crypto.AddressFromBech32(v.ToAddress)
		if err != nil {
			return nil, fmt.Errorf("to_address: %w", err)
		}

		amount, err := std.ParseCoins(v.Amount)
		if err != nil || amount.Empty() {
			return nil, fmt.Errorf("amount must be coins such as 1000ugnot")
		}

		return bank.MsgSend{FromAddress: master, ToAddress: to, Amount: amount}, nil
	default:
		return nil, fmt.Errorf("%s cannot be signed by a session", m.typ)
	}
}

func checkSigner(field string, master crypto.Address) error {
	if field != "" && field != master.String() {
		return fmt.Errorf("signer %s is not the wallet address %s", field, master)
	}

	return nil
}

func parseCoinPair(send, maxDeposit string) (std.Coins, std.Coins, error) {
	sendCoins, err := std.ParseCoins(send)
	if err != nil {
		return nil, nil, fmt.Errorf("send: %w", err)
	}

	depositCoins, err := std.ParseCoins(maxDeposit)
	if err != nil {
		return nil, nil, fmt.Errorf("max_deposit: %w", err)
	}

	return sendCoins, depositCoins, nil
}
