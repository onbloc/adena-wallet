//go:build windows

package hostinstall

import (
	"errors"

	"golang.org/x/sys/windows/registry"
)

var systemRegistry Registry = currentUserRegistry{}

// currentUserRegistry writes under HKEY_CURRENT_USER, which needs no
// elevation and is where browsers look for per-user hosts.
type currentUserRegistry struct{}

func (currentUserRegistry) SetDefault(key, value string) error {
	k, _, err := registry.CreateKey(registry.CURRENT_USER, key, registry.SET_VALUE)
	if err != nil {
		return err
	}

	defer func() { _ = k.Close() }()

	return k.SetStringValue("", value)
}

func (currentUserRegistry) Delete(key string) error {
	err := registry.DeleteKey(registry.CURRENT_USER, key)
	if errors.Is(err, registry.ErrNotExist) {
		return nil
	}

	return err
}

func (currentUserRegistry) Exists(key string) bool {
	k, err := registry.OpenKey(registry.CURRENT_USER, key, registry.QUERY_VALUE)
	if err != nil {
		return false
	}

	_ = k.Close()

	return true
}
