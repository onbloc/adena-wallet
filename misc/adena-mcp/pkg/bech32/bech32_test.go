package bech32

import (
	"encoding/hex"
	"testing"
)

func TestDecodeGnoPublicKey(t *testing.T) {
	t.Parallel()

	const pub = "gpub1pgfj7ard9eg82cjtv4u4xetrwqer2dntxyfzxz3pqf4w3gn7lyh333vmh7jaek2gt88tm860sl49qdfkn6dqkpqwexs6w7hv9qd"

	hrp, data, err := Decode(pub)
	if err != nil {
		t.Fatal(err)
	}

	if hrp != "gpub" {
		t.Fatalf("got hrp %q", hrp)
	}

	const want = "0a132f746d2e5075624b6579536563703235366b3112230a21" +
		"026ae8a27ef92f18c59bbfa5dcd94859cebd9f4f87ea5035369e9a0b040ec9a1a7"

	if hex.EncodeToString(data) != want {
		t.Fatalf("got %x", data)
	}
}

func TestDecodeBIP173Vectors(t *testing.T) {
	t.Parallel()

	for _, s := range []string{
		"A12UEL5L",
		"abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw",
	} {
		if _, _, err := Decode(s); err != nil {
			t.Errorf("%s: %v", s, err)
		}
	}
}

func TestDecodeRejectsInvalid(t *testing.T) {
	t.Parallel()

	for _, s := range []string{
		"g1", // empty data
		"aBcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw", // mixed case
		"abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxx", // bad checksum
		"abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxb", // invalid character
	} {
		if _, _, err := Decode(s); err == nil {
			t.Errorf("%s: expected an error", s)
		}
	}
}
