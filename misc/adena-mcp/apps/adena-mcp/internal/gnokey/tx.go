package gnokey

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// TxKind is a gnokey maketx subcommand.
type TxKind string

// Supported transaction kinds.
const (
	TxCall TxKind = "call"
	TxRun  TxKind = "run"
	TxSend TxKind = "send"
)

// TxOptions describes one session-signed transaction.
type TxOptions struct {
	Kind     TxKind
	KeyName  string
	Password string
	Master   string
	Remote   string
	ChainID  string
	GasFee   string
	Memo     string
	// Send is the coin amount attached to a call or run, or transferred by send.
	Send       string
	MaxDeposit string
	// Call fields.
	PkgPath string
	Func    string
	// File is the Gno source file for run.
	File string
	// To is the recipient for send.
	To        string
	Args      []string
	GasWanted int64
	// Simulate runs the transaction without broadcasting it.
	Simulate bool
}

// TxResult is the parsed gnokey output.
type TxResult struct {
	Fields    map[string]string
	Output    string
	TxHash    string
	Height    int64
	GasWanted int64
	GasUsed   int64
}

// MakeTx signs the transaction with the session key and broadcasts it, or
// only simulates it when opts.Simulate is set.
func (c *CLI) MakeTx(ctx context.Context, opts TxOptions) (TxResult, error) {
	args, err := txArgs(c.home, opts)
	if err != nil {
		return TxResult{}, err
	}

	out, err := c.exec(ctx, "maketx "+string(opts.Kind), opts.Password+"\n", args...)
	if err != nil {
		return TxResult{}, err
	}

	return ParseTxOutput(out), nil
}

func txArgs(home string, opts TxOptions) ([]string, error) {
	if opts.KeyName == "" || opts.Master == "" || opts.Remote == "" || opts.ChainID == "" {
		return nil, errors.New("key name, master, remote and chain id are required")
	}

	if opts.GasFee == "" || opts.GasWanted <= 0 {
		return nil, errors.New("gas fee and gas wanted are required")
	}

	args := []string{
		"maketx", string(opts.Kind),
		"-home", home,
		"-insecure-password-stdin",
		"-master", opts.Master,
		"-remote", opts.Remote,
		"-chainid", opts.ChainID,
		"-gas-fee", opts.GasFee,
		"-gas-wanted", strconv.FormatInt(opts.GasWanted, 10),
		"-broadcast",
	}

	if opts.Simulate {
		args = append(args, "-simulate", "only")
	}

	if opts.Memo != "" {
		args = append(args, "-memo", opts.Memo)
	}

	if opts.Send != "" {
		args = append(args, "-send", opts.Send)
	}

	switch opts.Kind {
	case TxCall:
		if opts.PkgPath == "" || opts.Func == "" {
			return nil, errors.New("pkg path and func are required for call")
		}

		if opts.MaxDeposit != "" {
			args = append(args, "-max-deposit", opts.MaxDeposit)
		}

		args = append(args, "-pkgpath", opts.PkgPath, "-func", opts.Func)
		for _, arg := range opts.Args {
			args = append(args, "-args", arg)
		}

		return append(args, opts.KeyName), nil
	case TxRun:
		if opts.File == "" {
			return nil, errors.New("file is required for run")
		}

		if opts.MaxDeposit != "" {
			args = append(args, "-max-deposit", opts.MaxDeposit)
		}

		return append(args, opts.KeyName, opts.File), nil
	case TxSend:
		if opts.To == "" || opts.Send == "" {
			return nil, errors.New("recipient and amount are required for send")
		}

		return append(args, "-to", opts.To, opts.KeyName), nil
	default:
		return nil, fmt.Errorf("unsupported transaction kind %q", opts.Kind)
	}
}

// ParseTxOutput reads the "KEY: value" lines gnokey prints after a
// transaction.
func ParseTxOutput(out string) TxResult {
	result := TxResult{Output: out, Fields: map[string]string{}}

	for line := range strings.Lines(out) {
		key, value, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}

		key = strings.TrimSpace(key)
		if key == "" || strings.ToUpper(key) != key {
			continue
		}

		value = strings.TrimSpace(value)
		result.Fields[key] = value

		switch key {
		case "TX HASH":
			result.TxHash = value
		case "HEIGHT":
			result.Height = parseInt(value)
		case "GAS WANTED":
			result.GasWanted = parseInt(value)
		case "GAS USED":
			result.GasUsed = parseInt(value)
		}
	}

	return result
}

// parseInt returns 0 for values gnokey did not print as a plain integer.
func parseInt(value string) int64 {
	n, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0
	}

	return n
}

// Query runs an ABCI query and returns the data payload.
func (c *CLI) Query(ctx context.Context, remote, path string) (string, error) {
	out, err := c.exec(ctx, "query", "", "query", "-remote", remote, path)
	if err != nil {
		return "", err
	}

	// The payload follows "data:" and may span several lines.
	_, data, ok := strings.Cut(out, "data:")
	if !ok {
		return "", fmt.Errorf("gnokey query %s: no data in output", path)
	}

	return strings.TrimSpace(data), nil
}
