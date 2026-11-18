// Package session stores public metadata about the sessions this MCP server
// created: addresses, public keys and the approved scope. It never holds key
// material, so the file reveals nothing that can sign.
package session

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"sync"
	"time"
)

// Status of a stored session.
const (
	StatusActive  = "active"
	StatusRevoked = "revoked"
)

// Allow-path route types, matching the chain grammar.
const (
	RouteExec = "vm/exec"
	RouteRun  = "vm/run"
	RouteSend = "bank/send"
)

const filePerm = 0o600

// ErrNotFound means no stored session matches.
var ErrNotFound = errors.New("session not found")

// Record is one session and the scope the user approved.
type Record struct {
	SessionAddress   string `json:"session_address"`
	SessionPublicKey string `json:"session_public_key"`
	MasterAddress    string `json:"master_address"`
	ChainID          string `json:"chain_id"`
	RPCURL           string `json:"rpc_url"`
	SpendLimit       string `json:"spend_limit"`
	Status           string `json:"status"`
	TxHash           string `json:"tx_hash,omitempty"`
	// AgentName is the agent that created the session. Records written before
	// it existed have none and belong to every agent.
	AgentName   string   `json:"agent_name,omitempty"`
	AllowPaths  []string `json:"allow_paths"`
	SpendPeriod int64    `json:"spend_period,omitempty"`
	ExpiresAt   int64    `json:"expires_at"`
	CreatedAt   int64    `json:"created_at"`
}

// Expired reports whether the session expiry has passed at now.
func (r *Record) Expired(now time.Time) bool {
	return r.ExpiresAt > 0 && now.Unix() >= r.ExpiresAt
}

// OwnedBy reports whether agent created the session.
func (r *Record) OwnedBy(agent string) bool {
	return r.AgentName == "" || r.AgentName == agent
}

// Usable reports whether the session can still sign at now.
func (r *Record) Usable(now time.Time) bool {
	return r.Status == StatusActive && !r.Expired(now)
}

// Allows reports whether the approved allow paths cover a message of route,
// targeting pkgPath for vm/exec. It mirrors the chain's prefix rule, which
// matches the realm itself or a sub-path but not a sibling sharing a prefix.
func (r *Record) Allows(route, pkgPath string) bool {
	for _, entry := range r.AllowPaths {
		if entry == "*" {
			return true
		}

		entryRoute, prefix, hasPath := strings.Cut(entry, ":")
		if entryRoute != route {
			continue
		}

		if !hasPath || route != RouteExec {
			return true
		}

		if pkgPath == prefix || strings.HasPrefix(pkgPath, prefix+"/") {
			return true
		}
	}

	return false
}

// Store persists records as one JSON file. Every adena-mcp process of the
// user shares it, so each access also holds an exclusive lock on a sibling
// lock file.
type Store struct {
	path string
	mu   sync.Mutex
}

// locked runs fn while holding both the process and the file lock.
func (s *Store) locked(fn func() error) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	unlock, err := lockFile(s.path + ".lock")
	if err != nil {
		return fmt.Errorf("lock sessions: %w", err)
	}
	defer unlock()

	return fn()
}

// NewStore returns a store backed by path.
func NewStore(path string) *Store {
	return &Store{path: path}
}

// List returns every record, newest first.
func (s *Store) List() ([]Record, error) {
	var records []Record

	err := s.locked(func() error {
		var loadErr error
		records, loadErr = s.load()

		return loadErr
	})

	return records, err
}

// Get returns the record for a session address.
func (s *Store) Get(sessionAddress string) (Record, error) {
	records, err := s.List()
	if err != nil {
		return Record{}, err
	}

	for _, r := range records {
		if r.SessionAddress == sessionAddress {
			return r, nil
		}
	}

	return Record{}, fmt.Errorf("%w: %s", ErrNotFound, sessionAddress)
}

// Put inserts or replaces the record with the same session address.
func (s *Store) Put(record Record) error {
	return s.locked(func() error {
		records, err := s.load()
		if err != nil {
			return err
		}

		records = slices.DeleteFunc(records, func(r Record) bool { return r.SessionAddress == record.SessionAddress })
		records = append(records, record)

		return s.save(records)
	})
}

// Scrub rewrites the file so fields earlier versions stored, such as keybase
// passwords, are dropped.
func (s *Store) Scrub() error {
	return s.locked(func() error {
		if _, err := os.Stat(s.path); errors.Is(err, os.ErrNotExist) {
			return nil
		}

		records, err := s.load()
		if err != nil {
			return err
		}

		return s.save(records)
	})
}

// Delete removes the record for a session address.
func (s *Store) Delete(sessionAddress string) error {
	return s.locked(func() error {
		records, err := s.load()
		if err != nil {
			return err
		}

		return s.save(slices.DeleteFunc(records, func(r Record) bool { return r.SessionAddress == sessionAddress }))
	})
}

func (s *Store) load() ([]Record, error) {
	data, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}

	if err != nil {
		return nil, fmt.Errorf("read sessions: %w", err)
	}

	var records []Record
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, fmt.Errorf("decode sessions: %w", err)
	}

	slices.SortStableFunc(records, func(a, b Record) int { return int(b.CreatedAt - a.CreatedAt) })

	return records, nil
}

// save writes through a temporary file so a crash never leaves a truncated
// store behind.
func (s *Store) save(records []Record) error {
	data, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return fmt.Errorf("encode sessions: %w", err)
	}

	tmp, err := os.CreateTemp(filepath.Dir(s.path), ".sessions-*")
	if err != nil {
		return fmt.Errorf("write sessions: %w", err)
	}

	defer func() { _ = os.Remove(tmp.Name()) }()

	// Windows has no permission bits; the agent home's ACL covers the file.
	if runtime.GOOS != "windows" {
		if err := tmp.Chmod(filePerm); err != nil {
			_ = tmp.Close()

			return fmt.Errorf("write sessions: %w", err)
		}
	}

	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()

		return fmt.Errorf("write sessions: %w", err)
	}

	if err := tmp.Close(); err != nil {
		return fmt.Errorf("write sessions: %w", err)
	}

	if err := os.Rename(tmp.Name(), s.path); err != nil {
		return fmt.Errorf("write sessions: %w", err)
	}

	return nil
}
