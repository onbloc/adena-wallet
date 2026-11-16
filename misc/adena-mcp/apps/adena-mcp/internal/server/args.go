package server

import (
	"fmt"
	"math"
)

// InvalidArg reports a malformed argument.
func InvalidArg(name, reason string) *ToolError {
	return &ToolError{Code: "invalid_argument", Message: name + ": " + reason}
}

// StringArg returns args[name], or "" when absent.
func StringArg(args map[string]any, name string) (string, error) {
	v, ok := args[name]
	if !ok || v == nil {
		return "", nil
	}

	s, ok := v.(string)
	if !ok {
		return "", InvalidArg(name, "must be a string")
	}

	return s, nil
}

// RequiredStringArg returns a non-empty args[name].
func RequiredStringArg(args map[string]any, name string) (string, error) {
	s, err := StringArg(args, name)
	if err != nil {
		return "", err
	}

	if s == "" {
		return "", InvalidArg(name, "required")
	}

	return s, nil
}

// StringSliceArg returns args[name] as strings, or nil when absent.
func StringSliceArg(args map[string]any, name string) ([]string, error) {
	v, ok := args[name]
	if !ok || v == nil {
		return nil, nil
	}

	items, ok := v.([]any)
	if !ok {
		return nil, InvalidArg(name, "must be an array of strings")
	}

	out := make([]string, 0, len(items))

	for i, item := range items {
		s, isString := item.(string)
		if !isString {
			return nil, InvalidArg(fmt.Sprintf("%s[%d]", name, i), "must be a string")
		}

		out = append(out, s)
	}

	return out, nil
}

// IntArg returns args[name] as an integer, or def when absent.
func IntArg(args map[string]any, name string, def int64) (int64, error) {
	v, ok := args[name]
	if !ok || v == nil {
		return def, nil
	}

	f, ok := v.(float64)
	if !ok || f != math.Trunc(f) || f < math.MinInt64 || f > math.MaxInt64 {
		return 0, InvalidArg(name, "must be an integer")
	}

	return int64(f), nil
}

// BoolArg returns args[name], or def when absent.
func BoolArg(args map[string]any, name string, def bool) (bool, error) {
	v, ok := args[name]
	if !ok || v == nil {
		return def, nil
	}

	b, ok := v.(bool)
	if !ok {
		return false, InvalidArg(name, "must be a boolean")
	}

	return b, nil
}
