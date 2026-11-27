package nativemsg

import (
	"bytes"
	"encoding/binary"
	"errors"
	"testing"
)

func TestRoundTrip(t *testing.T) {
	t.Parallel()

	var buf bytes.Buffer

	messages := [][]byte{[]byte(`{"id":"1"}`), []byte(`{}`), {}}
	for _, m := range messages {
		if err := Write(&buf, m); err != nil {
			t.Fatalf("write: %v", err)
		}
	}

	for _, want := range messages {
		got, err := Read(&buf)
		if err != nil {
			t.Fatalf("read: %v", err)
		}

		if !bytes.Equal(got, want) {
			t.Fatalf("got %q, want %q", got, want)
		}
	}
}

func TestWriteRejectsOversizedMessage(t *testing.T) {
	t.Parallel()

	err := Write(&bytes.Buffer{}, make([]byte, MaxHostMessageSize+1))
	if !errors.Is(err, ErrMessageTooLarge) {
		t.Fatalf("got %v, want ErrMessageTooLarge", err)
	}
}

func TestReadRejectsOversizedFrame(t *testing.T) {
	t.Parallel()

	var buf bytes.Buffer

	if err := binary.Write(&buf, binary.NativeEndian, uint32(MaxBrowserMessageSize+1)); err != nil {
		t.Fatal(err)
	}

	if _, err := Read(&buf); !errors.Is(err, ErrMessageTooLarge) {
		t.Fatalf("got %v, want ErrMessageTooLarge", err)
	}
}

func TestReadTruncatedBody(t *testing.T) {
	t.Parallel()

	var buf bytes.Buffer

	if err := binary.Write(&buf, binary.NativeEndian, uint32(10)); err != nil {
		t.Fatal(err)
	}

	buf.WriteString("abc")

	if _, err := Read(&buf); err == nil {
		t.Fatal("expected an error for a truncated body")
	}
}
