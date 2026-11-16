// Package bech32 decodes BIP-173 bech32 strings such as gno addresses and
// public keys. Gno public keys exceed the BIP-173 90 character limit, so no
// length limit is enforced.
package bech32

import (
	"errors"
	"fmt"
	"strings"
)

const (
	charset      = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
	checksumSize = 6
)

var generator = [5]uint32{0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3}

// Decode returns the human-readable part and the 8-bit data of s.
func Decode(s string) (string, []byte, error) {
	if strings.ToLower(s) != s && strings.ToUpper(s) != s {
		return "", nil, errors.New("bech32: mixed case")
	}

	s = strings.ToLower(s)

	separator := strings.LastIndexByte(s, '1')
	if separator < 1 || separator+checksumSize+1 > len(s) {
		return "", nil, errors.New("bech32: invalid separator position")
	}

	hrp := s[:separator]

	values := make([]byte, 0, len(s)-separator-1)

	for _, c := range s[separator+1:] {
		index := strings.IndexRune(charset, c)
		if index < 0 {
			return "", nil, fmt.Errorf("bech32: invalid character %q", c)
		}

		values = append(values, byte(index))
	}

	if polymod(append(expandHRP(hrp), values...)) != 1 {
		return "", nil, errors.New("bech32: invalid checksum")
	}

	data, err := convertBits(values[:len(values)-checksumSize])
	if err != nil {
		return "", nil, err
	}

	return hrp, data, nil
}

func expandHRP(hrp string) []byte {
	out := make([]byte, 0, len(hrp)*2+1)
	for i := range len(hrp) {
		out = append(out, hrp[i]>>5)
	}

	out = append(out, 0)
	for i := range len(hrp) {
		out = append(out, hrp[i]&31)
	}

	return out
}

func polymod(values []byte) uint32 {
	checksum := uint32(1)

	for _, v := range values {
		top := checksum >> 25
		checksum = (checksum&0x1ffffff)<<5 ^ uint32(v)

		for i, g := range generator {
			if (top>>i)&1 == 1 {
				checksum ^= g
			}
		}
	}

	return checksum
}

// convertBits regroups 5-bit values into bytes, rejecting non-zero padding.
func convertBits(values []byte) ([]byte, error) {
	var (
		acc  uint32
		bits uint
	)

	out := make([]byte, 0, len(values)*5/8)

	for _, v := range values {
		acc = acc<<5 | uint32(v)
		bits += 5

		for bits >= 8 {
			bits -= 8
			out = append(out, byte(acc>>bits))
		}
	}

	if bits >= 5 || (acc<<(8-bits))&0xff != 0 {
		return nil, errors.New("bech32: invalid padding")
	}

	return out, nil
}
