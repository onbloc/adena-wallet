package sessionkey

import (
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
