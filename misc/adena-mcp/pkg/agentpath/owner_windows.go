package agentpath

import (
	"fmt"

	"golang.org/x/sys/windows"
)

// IsOwnedByUser reports whether path, not followed if it is a link or socket,
// belongs to the current user, SYSTEM or Administrators.
func IsOwnedByUser(path string) (bool, error) {
	user, err := windows.GetCurrentProcessToken().GetTokenUser()
	if err != nil {
		return false, fmt.Errorf("read process user: %w", err)
	}

	return hasTrustedOwner(path, user.User.Sid)
}
