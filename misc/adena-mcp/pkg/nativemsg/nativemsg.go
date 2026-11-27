// Package nativemsg implements the browser native messaging wire format: each
// message is UTF-8 JSON preceded by its 32-bit length in native byte order.
package nativemsg

import (
	"encoding/binary"
	"errors"
	"fmt"
	"io"
)

// MaxHostMessageSize is the largest message a host may send to the browser.
const MaxHostMessageSize = 1 << 20

// MaxBrowserMessageSize bounds what the host accepts from the browser.
const MaxBrowserMessageSize = 4 << 20

// ErrMessageTooLarge is returned when a frame exceeds its size limit.
var ErrMessageTooLarge = errors.New("native message too large")

// Read reads one framed message from the browser.
func Read(r io.Reader) ([]byte, error) {
	var size uint32
	if err := binary.Read(r, binary.NativeEndian, &size); err != nil {
		return nil, err
	}

	if size > MaxBrowserMessageSize {
		return nil, fmt.Errorf("%w: %d bytes", ErrMessageTooLarge, size)
	}

	buf := make([]byte, size)
	if _, err := io.ReadFull(r, buf); err != nil {
		return nil, fmt.Errorf("read native message body: %w", err)
	}

	return buf, nil
}

// Write writes one framed message to the browser.
func Write(w io.Writer, message []byte) error {
	if len(message) > MaxHostMessageSize {
		return fmt.Errorf("%w: %d bytes", ErrMessageTooLarge, len(message))
	}

	frame := make([]byte, 4+len(message))
	binary.NativeEndian.PutUint32(frame, uint32(len(message))) //nolint:gosec // bounded above

	copy(frame[4:], message)

	_, err := w.Write(frame)

	return err
}
