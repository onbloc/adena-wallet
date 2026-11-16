package gnokey

import (
	"context"
	"encoding/hex"
	"errors"
	"slices"
	"strings"
	"testing"
)

const testKeyName = "testk"

const listOutput = "0. testk (local) - addr: g1nd8aatp6f59jvhff9r7f759ptt06sd3g7eh2tj " +
	"pub: gpub1pgfj7ard9eg82cjtv4u4xetrwqer2dntxyfzxz3pqf4w3gn7lyh333vmh7jaek2gt88tm860sl49qdfkn6dqkpqwexs6w7hv9qd, " +
	"path: <nil>\n"

func TestParseList(t *testing.T) {
	t.Parallel()

	keys := ParseList("noise\n" + listOutput)
	if len(keys) != 1 {
		t.Fatalf("got %d keys", len(keys))
	}

	if keys[0].Name != testKeyName || keys[0].Address != "g1nd8aatp6f59jvhff9r7f759ptt06sd3g7eh2tj" ||
		!strings.HasPrefix(keys[0].PubKey, "gpub1") || strings.HasSuffix(keys[0].PubKey, ",") {
		t.Fatalf("unexpected key %+v", keys[0])
	}
}

func TestCompressedPubKey(t *testing.T) {
	t.Parallel()

	key := ParseList(listOutput)[0]

	pub, err := CompressedPubKey(key.PubKey)
	if err != nil {
		t.Fatal(err)
	}

	if hex.EncodeToString(pub) != "026ae8a27ef92f18c59bbfa5dcd94859cebd9f4f87ea5035369e9a0b040ec9a1a7" {
		t.Fatalf("got %x", pub)
	}

	if _, err := CompressedPubKey("g1nd8aatp6f59jvhff9r7f759ptt06sd3g7eh2tj"); err == nil {
		t.Fatal("expected an error for an address")
	}
}

func TestAddKeyFeedsPasswordTwice(t *testing.T) {
	t.Parallel()

	var calls [][]string

	var stdins []string

	cli := NewWithRunner("/keys", func(_ context.Context, stdin string, args ...string) (string, string, error) {
		calls = append(calls, args)
		stdins = append(stdins, stdin)

		if args[0] == "list" {
			return listOutput, "", nil
		}

		return "", "", nil
	})

	key, err := cli.AddKey(context.Background(), testKeyName, "pw")
	if err != nil {
		t.Fatal(err)
	}

	if key.Name != testKeyName {
		t.Fatalf("got %+v", key)
	}

	add := calls[0]
	if stdins[0] != "pw\npw\n" || !slices.Contains(add, "-insecure-password-stdin") || add[len(add)-1] != testKeyName {
		t.Fatalf("unexpected add invocation %v %q", calls[0], stdins[0])
	}
}

func TestCommandErrorCarriesOutput(t *testing.T) {
	t.Parallel()

	cli := NewWithRunner("/keys", func(context.Context, string, ...string) (string, string, error) {
		return "", "session not allowed", errors.New("exit status 1")
	})

	_, err := cli.Query(context.Background(), "http://x", "auth/gasprice")

	var cmdErr *CommandError
	if !errors.As(err, &cmdErr) || cmdErr.Output != "session not allowed" {
		t.Fatalf("got %v", err)
	}
}

func TestTxArgsCall(t *testing.T) {
	t.Parallel()

	args, err := txArgs("/keys", TxOptions{
		Kind: TxCall, KeyName: "s1", Master: "g1master", Remote: "http://rpc", ChainID: "dev",
		GasFee: "100ugnot", GasWanted: 2000, PkgPath: "gno.land/r/demo/counter", Func: "Incr",
		Args: []string{"1", "two"}, Send: "5ugnot", Simulate: true,
	})
	if err != nil {
		t.Fatal(err)
	}

	joined := strings.Join(args, " ")
	for _, want := range []string{
		"maketx call", "-master g1master", "-simulate only", "-send 5ugnot",
		"-pkgpath gno.land/r/demo/counter", "-func Incr", "-args 1 -args two", "-gas-wanted 2000",
	} {
		if !strings.Contains(joined, want) {
			t.Errorf("missing %q in %q", want, joined)
		}
	}

	if args[len(args)-1] != "s1" {
		t.Fatalf("key name must be last, got %q", args[len(args)-1])
	}
}

func TestTxArgsRunPutsFileLast(t *testing.T) {
	t.Parallel()

	args, err := txArgs("/keys", TxOptions{
		Kind: TxRun, KeyName: "s1", Master: "g1m", Remote: "r", ChainID: "c",
		GasFee: "1ugnot", GasWanted: 1, File: "/tmp/main.gno",
	})
	if err != nil {
		t.Fatal(err)
	}

	if got := args[len(args)-2:]; got[0] != "s1" || got[1] != "/tmp/main.gno" {
		t.Fatalf("got %v", got)
	}
}

func TestTxArgsRequiresMaster(t *testing.T) {
	t.Parallel()

	if _, err := txArgs("/keys", TxOptions{Kind: TxSend, KeyName: "s1"}); err == nil {
		t.Fatal("expected an error without master")
	}
}

func TestParseTxOutput(t *testing.T) {
	t.Parallel()

	out := "(\"1\" int)\n\nOK!\nGAS WANTED: 2000000\nGAS USED:   123456\nHEIGHT:     42\n" +
		"EVENTS:     []\nINFO:       \nTX HASH:    abcd==\n"

	result := ParseTxOutput(out)
	if result.TxHash != "abcd==" || result.Height != 42 || result.GasUsed != 123456 || result.GasWanted != 2000000 {
		t.Fatalf("unexpected result %+v", result)
	}
}

func TestQueryReturnsMultilineData(t *testing.T) {
	t.Parallel()

	cli := NewWithRunner("/keys", func(context.Context, string, ...string) (string, string, error) {
		return "height: 0\ndata: {\n  \"gas\": \"1000\",\n  \"price\": \"1ugnot\"\n}\n", "", nil
	})

	data, err := cli.Query(context.Background(), "http://x", "auth/gasprice")
	if err != nil {
		t.Fatal(err)
	}

	if data != "{\n  \"gas\": \"1000\",\n  \"price\": \"1ugnot\"\n}" {
		t.Fatalf("got %q", data)
	}
}
