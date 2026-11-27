package sessionkey

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"testing"
)

func TestSignatureVerifiesWithChainPublicKey(t *testing.T) {
	t.Parallel()

	key, err := Generate()
	if err != nil {
		t.Fatal(err)
	}

	msg := []byte(`{"chain_id":"dev","msgs":[]}`)

	sig, err := key.Sign(msg)
	if err != nil {
		t.Fatal(err)
	}

	if len(sig) != signatureSize {
		t.Fatalf("signature is %d bytes", len(sig))
	}

	pub := key.TMPublicKey()
	if !pub.VerifyBytes(msg, sig) {
		t.Fatal("tm2 rejected the signature")
	}

	if pub.Address().String() != key.Address() || !strings.HasPrefix(key.Address(), "g1") {
		t.Fatalf("unexpected address %s", key.Address())
	}
}

func TestKeysAreDistinct(t *testing.T) {
	t.Parallel()

	a, err := Generate()
	if err != nil {
		t.Fatal(err)
	}

	b, err := Generate()
	if err != nil {
		t.Fatal(err)
	}

	if a.Address() == b.Address() {
		t.Fatal("two generated keys share an address")
	}
}

func TestFormattingNeverExposesInternals(t *testing.T) {
	t.Parallel()

	key, err := Generate()
	if err != nil {
		t.Fatal(err)
	}

	want := "sessionkey(" + key.Address() + ")"

	for _, verb := range []string{"%v", "%+v", "%#v", "%s", "%x", "%q"} {
		if got := fmt.Sprintf(verb, key); got != want {
			t.Errorf("%s printed %q", verb, got)
		}

		if got := fmt.Sprintf(verb, *key); got != want {
			t.Errorf("%s on a value printed %q", verb, got)
		}
	}

	var logs strings.Builder

	slog.New(slog.NewJSONHandler(&logs, nil)).Info("key", "key", key)

	if !strings.Contains(logs.String(), `"key":"`+want+`"`) {
		t.Errorf("slog printed %s", logs.String())
	}

	data, err := json.Marshal(map[string]any{"key": key})
	if err != nil || string(data) != `{"key":"[redacted]"}` {
		t.Errorf("json printed %s (%v)", data, err)
	}
}

func TestDestroyedKeyCannotSign(t *testing.T) {
	t.Parallel()

	key, err := Generate()
	if err != nil {
		t.Fatal(err)
	}

	ring := NewKeyring()
	ring.Put(key)
	ring.Destroy(key.Address())

	if _, ok := ring.Get(key.Address()); ok {
		t.Fatal("destroyed key still in keyring")
	}

	if _, err := key.Sign([]byte("x")); !errors.Is(err, ErrDestroyed) {
		t.Fatalf("got %v, want ErrDestroyed", err)
	}
}

func TestValidScalar(t *testing.T) {
	t.Parallel()

	if validScalar(make([]byte, privateKeySize)) {
		t.Fatal("zero is not a valid key")
	}

	overflow := make([]byte, privateKeySize)
	for i := range overflow {
		overflow[i] = 0xff
	}

	if validScalar(overflow) {
		t.Fatal("a value above N is not a valid key")
	}
}

func TestDestroyWipesThePad(t *testing.T) {
	t.Parallel()

	key, err := Generate()
	if err != nil {
		t.Fatal(err)
	}

	pad := key.s.pad
	key.Destroy()

	if pad.IsAlive() {
		t.Fatal("the pad survived Destroy")
	}

	if _, err := key.Sign([]byte("x")); !errors.Is(err, ErrDestroyed) {
		t.Fatalf("got %v, want ErrDestroyed", err)
	}

	// A second Destroy is harmless.
	key.Destroy()
}

func TestSealedKeyIsMasked(t *testing.T) {
	t.Parallel()

	key, err := Generate()
	if err != nil {
		t.Fatal(err)
	}

	buf, err := key.s.sealed.Open()
	if err != nil {
		t.Fatal(err)
	}
	defer buf.Destroy()

	// The enclave alone holds key XOR pad, not the key of this public key.
	if validScalar(buf.Bytes()) && bytes.Equal(derivePublicKey(buf.Bytes()), key.PublicKey()) {
		t.Fatal("the enclave holds the unmasked key")
	}

	buf.Melt()
	xorInto(buf.Bytes(), key.s.pad.Bytes())

	if !bytes.Equal(derivePublicKey(buf.Bytes()), key.PublicKey()) {
		t.Fatal("key XOR pad does not restore the key")
	}
}
