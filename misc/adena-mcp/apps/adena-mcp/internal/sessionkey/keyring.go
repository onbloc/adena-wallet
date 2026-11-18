package sessionkey

import (
	"sync"

	"github.com/awnumar/memguard"
)

// Keyring holds the live keys of this process by session address. Keys do not
// survive a restart; a session whose key is gone can only be revoked.
type Keyring struct {
	keys map[string]*Key
	mu   sync.Mutex
}

// NewKeyring returns an empty keyring.
func NewKeyring() *Keyring {
	return &Keyring{keys: make(map[string]*Key)}
}

// Put stores k under its address.
func (r *Keyring) Put(k *Key) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.keys[k.Address()] = k
}

// Get returns the key for address, if this process holds it.
func (r *Keyring) Get(address string) (*Key, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	k, ok := r.keys[address]

	return k, ok
}

// Destroy discards the key for address.
func (r *Keyring) Destroy(address string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if k, ok := r.keys[address]; ok {
		k.Destroy()
		delete(r.keys, address)
	}
}

// DestroyAll discards every key and wipes memguard's protected memory.
func (r *Keyring) DestroyAll() {
	r.mu.Lock()
	defer r.mu.Unlock()

	for address, k := range r.keys {
		k.Destroy()
		delete(r.keys, address)
	}

	memguard.Purge()
}
