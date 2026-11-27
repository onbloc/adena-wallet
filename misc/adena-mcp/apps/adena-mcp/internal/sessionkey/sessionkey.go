// Package sessionkey holds session private keys so that no mnemonic exists
// and the key material never leaves locked memory in a usable form.
//
// A key is generated directly inside a memguard buffer (mlocked, guard pages,
// outside the Go heap), masked with a per-key pad and sealed into an enclave,
// which keeps it encrypted while idle. Signing opens the enclave for the
// duration of one signature and zeroes every copy it made. Destroying a key
// wipes its pad, so the ciphertext left behind no longer yields the key. Keys
// are never written to disk, logged, or returned to callers; a Key formats as
// its address only.
package sessionkey

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"github.com/awnumar/memguard"
	"github.com/decred/dcrd/dcrec/secp256k1/v4"
	"github.com/decred/dcrd/dcrec/secp256k1/v4/ecdsa"
	tmsecp256k1 "github.com/gnolang/gno/tm2/pkg/crypto/secp256k1"
)

const (
	privateKeySize = 32
	signatureSize  = 64
	redacted       = "[redacted]"
)

// ErrDestroyed is returned when a destroyed key is used.
var ErrDestroyed = errors.New("session key destroyed")

// Key is a secp256k1 session key whose private half stays in an enclave.
// It wraps a pointer so that copies share state and value formatting has
// nothing to print but what the methods below choose.
type Key struct {
	s *state
}

type state struct {
	// sealed holds the key XOR pad; without pad it is useless.
	sealed    *memguard.Enclave
	pad       *memguard.LockedBuffer
	address   string
	publicKey []byte
	mu        sync.Mutex
}

// Generate creates a new random key. No seed phrase is derived, so the key
// cannot be recovered or exported.
func Generate() (*Key, error) {
	for {
		buf := memguard.NewBufferRandom(privateKeySize)

		if !validScalar(buf.Bytes()) {
			buf.Destroy()

			continue
		}

		publicKey := derivePublicKey(buf.Bytes())

		// NewBufferRandom returns frozen buffers; the pad stays frozen.
		pad := memguard.NewBufferRandom(privateKeySize)

		buf.Melt()
		xorInto(buf.Bytes(), pad.Bytes())

		// Seal encrypts the masked key into an enclave and destroys the buffer.
		sealed := buf.Seal()
		if sealed == nil {
			pad.Destroy()

			return nil, errors.New("seal session key")
		}

		return &Key{s: &state{
			sealed:    sealed,
			pad:       pad,
			publicKey: publicKey,
			address:   tmsecp256k1.PubKeySecp256k1(publicKey).Address().String(),
		}}, nil
	}
}

// validScalar reports whether b is a usable private key (non-zero, below N).
func validScalar(b []byte) bool {
	var scalar secp256k1.ModNScalar

	overflow := scalar.SetByteSlice(b)
	valid := !overflow && !scalar.IsZero()

	scalar.Zero()

	return valid
}

func derivePublicKey(b []byte) []byte {
	priv := secp256k1.PrivKeyFromBytes(b)
	defer priv.Zero()

	return priv.PubKey().SerializeCompressed()
}

// PublicKey returns the 33-byte compressed public key.
func (k Key) PublicKey() []byte {
	return append([]byte(nil), k.s.publicKey...)
}

// TMPublicKey returns the public key in the chain's type.
func (k Key) TMPublicKey() tmsecp256k1.PubKeySecp256k1 {
	return tmsecp256k1.PubKeySecp256k1(k.s.publicKey)
}

// Address returns the bech32 session address.
func (k Key) Address() string {
	return k.s.address
}

// Sign returns the 64-byte R||S signature over sha256(msg) that tm2 expects.
func (k Key) Sign(msg []byte) ([]byte, error) {
	k.s.mu.Lock()
	defer k.s.mu.Unlock()

	if k.s.pad == nil || !k.s.pad.IsAlive() {
		return nil, ErrDestroyed
	}

	buf, err := k.s.sealed.Open()
	if err != nil {
		return nil, fmt.Errorf("open session key: %w", err)
	}
	defer buf.Destroy()

	buf.Melt()
	xorInto(buf.Bytes(), k.s.pad.Bytes())

	priv := secp256k1.PrivKeyFromBytes(buf.Bytes())
	defer priv.Zero()

	hash := sha256.Sum256(msg)

	compact := ecdsa.SignCompact(priv, hash[:], false)
	if len(compact) != signatureSize+1 {
		return nil, errors.New("unexpected signature size")
	}

	// Drop the recovery byte, as tm2 does.
	return append([]byte(nil), compact[1:]...), nil
}

// Destroy discards the key by wiping its pad. Later calls to Sign fail.
func (k Key) Destroy() {
	k.s.mu.Lock()
	defer k.s.mu.Unlock()

	if k.s.pad != nil {
		k.s.pad.Destroy()
	}

	k.s.pad = nil
	k.s.sealed = nil
}

// xorInto sets dst to dst XOR pad.
func xorInto(dst, pad []byte) {
	for i := range dst {
		dst[i] ^= pad[i]
	}
}

// String identifies the key by address only.
func (k Key) String() string {
	return "sessionkey(" + k.s.address + ")"
}

// GoString keeps %#v from printing struct internals.
func (k Key) GoString() string {
	return k.String()
}

// Format makes every fmt verb print the redacted form.
func (k Key) Format(f fmt.State, _ rune) {
	_, _ = fmt.Fprint(f, k.String())
}

// LogValue keeps slog from walking the struct.
func (k Key) LogValue() slog.Value {
	return slog.StringValue(k.String())
}

// MarshalJSON refuses to serialize anything but the address.
func (k Key) MarshalJSON() ([]byte, error) {
	return []byte(`"` + redacted + `"`), nil
}

// MarshalText mirrors MarshalJSON for text encoders.
func (k Key) MarshalText() ([]byte, error) {
	return []byte(redacted), nil
}
