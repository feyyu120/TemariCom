package utils

import (
	"net"
	"net/netip"
	"strings"
)

// ParseIPAddress safely parses an IP string (handling ports, IPv4, IPv6, and brackets) into *netip.Addr.
func ParseIPAddress(rawIP string) *netip.Addr {
	clean := strings.TrimSpace(rawIP)
	if clean == "" {
		return nil
	}

	// Strip port if present (e.g. "127.0.0.1:54321" or "[::1]:54321")
	if host, _, err := net.SplitHostPort(clean); err == nil {
		clean = host
	}

	// Strip IPv6 enclosing brackets if present
	clean = strings.Trim(clean, "[]")

	if addr, err := netip.ParseAddr(clean); err == nil {
		return &addr
	}

	return nil
}
