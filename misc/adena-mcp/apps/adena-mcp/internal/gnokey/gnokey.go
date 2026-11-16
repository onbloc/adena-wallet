// Package gnokey drives the gnokey CLI. Session keys live in a dedicated
// keybase, and every session-signed transaction is a gnokey maketx command
// with --master, so the chain sees the user's account as the caller.
package gnokey

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"regexp"
	"strings"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/pkg/bech32"
)

// Runner executes gnokey with args, feeding stdin.
type Runner func(ctx context.Context, stdin string, args ...string) (stdout, stderr string, err error)

// CLI wraps a gnokey binary and keybase directory.
type CLI struct {
	run  Runner
	home string
}

// New returns a CLI for the gnokey binary bin using the keybase in home.
func New(bin, home string) *CLI {
	return NewWithRunner(home, execRunner(bin))
}

// NewWithRunner returns a CLI that uses run instead of a real binary.
func NewWithRunner(home string, run Runner) *CLI {
	return &CLI{run: run, home: home}
}

func execRunner(bin string) Runner {
	return func(ctx context.Context, stdin string, args ...string) (string, string, error) {
		cmd := exec.CommandContext(ctx, bin, args...)

		var stdout, stderr bytes.Buffer

		cmd.Stdin = strings.NewReader(stdin)
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err := cmd.Run()

		return stdout.String(), stderr.String(), err
	}
}

// Key is a keybase entry.
type Key struct {
	Name    string
	Address string
	PubKey  string
}

// CommandError is a failed gnokey invocation.
type CommandError struct {
	Err    error
	Output string
	Op     string
}

func (e *CommandError) Error() string {
	return fmt.Sprintf("gnokey %s: %v: %s", e.Op, e.Err, strings.TrimSpace(e.Output))
}

func (e *CommandError) Unwrap() error { return e.Err }

func (c *CLI) exec(ctx context.Context, op, stdin string, args ...string) (string, error) {
	stdout, stderr, err := c.run(ctx, stdin, args...)
	if err != nil {
		return stdout, &CommandError{Op: op, Err: err, Output: stderr + stdout}
	}

	return stdout, nil
}

// AddKey creates a new random key protected by password.
func (c *CLI) AddKey(ctx context.Context, name, password string) (Key, error) {
	stdin := password + "\n" + password + "\n"
	if _, err := c.exec(ctx, "add", stdin,
		"add", "-home", c.home, "-insecure-password-stdin", "-nobackup", "-quiet", name); err != nil {
		return Key{}, err
	}

	return c.Key(ctx, name)
}

// Key looks up name in the keybase.
func (c *CLI) Key(ctx context.Context, name string) (Key, error) {
	out, err := c.exec(ctx, "list", "", "list", "-home", c.home)
	if err != nil {
		return Key{}, err
	}

	for _, key := range ParseList(out) {
		if key.Name == name {
			return key, nil
		}
	}

	return Key{}, fmt.Errorf("gnokey: key %q not found", name)
}

// DeleteKey removes name from the keybase.
func (c *CLI) DeleteKey(ctx context.Context, name string) error {
	_, err := c.exec(ctx, "delete", "", "delete", "-home", c.home, "-force", name)

	return err
}

var listLine = regexp.MustCompile(`^\d+\.\s+(\S+)\s+\((\w+)\)\s+-\s+addr:\s+(\S+)\s+pub:\s+([^,\s]+)`)

// ParseList parses gnokey list output.
func ParseList(out string) []Key {
	keys := make([]Key, 0, strings.Count(out, "\n"))

	for line := range strings.Lines(out) {
		m := listLine.FindStringSubmatch(strings.TrimSpace(line))
		if m == nil {
			continue
		}

		keys = append(keys, Key{Name: m[1], Address: m[3], PubKey: m[4]})
	}

	return keys
}

// secp256k1AminoPrefix is the amino encoding of a PubKeySecp256k1 up to the
// 33-byte compressed key.
var secp256k1AminoPrefix = append([]byte{0x0a, 0x13}, []byte("/tm.PubKeySecp256k1\x12\x23\x0a\x21")...)

// CompressedPubKey extracts the compressed secp256k1 key from a gpub string.
func CompressedPubKey(gpub string) ([]byte, error) {
	hrp, data, err := bech32.Decode(gpub)
	if err != nil {
		return nil, err
	}

	if hrp != "gpub" {
		return nil, fmt.Errorf("unexpected public key prefix %q", hrp)
	}

	if !bytes.HasPrefix(data, secp256k1AminoPrefix) || len(data) != len(secp256k1AminoPrefix)+33 {
		return nil, errors.New("public key is not a secp256k1 key")
	}

	return data[len(secp256k1AminoPrefix):], nil
}
