package session

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestAllows(t *testing.T) {
	t.Parallel()

	r := Record{AllowPaths: []string{"vm/exec:gno.land/r/demo", "bank/send"}}

	cases := []struct {
		route, path string
		want        bool
	}{
		{RouteExec, "gno.land/r/demo", true},
		{RouteExec, "gno.land/r/demo/counter", true},
		{RouteExec, "gno.land/r/demo_evil", false},
		{RouteExec, "gno.land/r/other", false},
		{RouteSend, "", true},
		{RouteRun, "", false},
	}

	for _, c := range cases {
		if got := r.Allows(c.route, c.path); got != c.want {
			t.Errorf("Allows(%s, %s) = %t, want %t", c.route, c.path, got, c.want)
		}
	}

	if !(&Record{AllowPaths: []string{"vm/exec"}}).Allows(RouteExec, "gno.land/r/any") {
		t.Error("bare vm/exec must allow any realm")
	}
}

func TestUsable(t *testing.T) {
	t.Parallel()

	now := time.Unix(1000, 0)

	if !(&Record{Status: StatusActive, ExpiresAt: 2000}).Usable(now) {
		t.Error("active unexpired session must be usable")
	}

	if (&Record{Status: StatusActive, ExpiresAt: 1000}).Usable(now) {
		t.Error("session at its expiry must not be usable")
	}

	if (&Record{Status: StatusRevoked, ExpiresAt: 2000}).Usable(now) {
		t.Error("revoked session must not be usable")
	}
}

func TestStoreRoundTrip(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "sessions.json")
	store := NewStore(path)

	if records, err := store.List(); err != nil || len(records) != 0 {
		t.Fatalf("empty store: %v %v", records, err)
	}

	for i, addr := range []string{"g1old", "g1new"} {
		if err := store.Put(Record{SessionAddress: addr, CreatedAt: int64(i)}); err != nil {
			t.Fatal(err)
		}
	}

	if err := store.Put(Record{SessionAddress: "g1old", CreatedAt: 0, Status: StatusRevoked}); err != nil {
		t.Fatal(err)
	}

	records, err := store.List()
	if err != nil {
		t.Fatal(err)
	}

	if len(records) != 2 || records[0].SessionAddress != "g1new" {
		t.Fatalf("want newest first without duplicates, got %+v", records)
	}

	got, err := store.Get("g1old")
	if err != nil || got.Status != StatusRevoked {
		t.Fatalf("got %+v %v", got, err)
	}

	info, err := os.Stat(path)
	if err != nil || info.Mode().Perm() != filePerm {
		t.Fatalf("store file mode %v %v", info.Mode().Perm(), err)
	}

	if err := store.Delete("g1old"); err != nil {
		t.Fatal(err)
	}

	if _, err := store.Get("g1old"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("got %v, want ErrNotFound", err)
	}
}
