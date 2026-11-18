//go:build windows

package hostinstall

import (
	"strconv"
	"testing"
	"time"
)

func TestCurrentUserRegistry(t *testing.T) {
	t.Parallel()

	key := `Software\AdenaAgentHostTest\` + strconv.FormatInt(time.Now().UnixNano(), 10)
	reg := currentUserRegistry{}

	t.Cleanup(func() {
		if err := reg.Delete(key); err != nil {
			t.Log(err)
		}
	})

	if reg.Exists(key) {
		t.Fatal("key exists before the test")
	}

	if err := reg.SetDefault(key, `C:\manifest.json`); err != nil {
		t.Fatal(err)
	}

	if !reg.Exists(key) {
		t.Fatal("key missing after SetDefault")
	}

	if err := reg.Delete(key); err != nil {
		t.Fatal(err)
	}

	if reg.Exists(key) {
		t.Fatal("key still exists after Delete")
	}

	if err := reg.Delete(key); err != nil {
		t.Fatalf("deleting a missing key must succeed, got %v", err)
	}
}
