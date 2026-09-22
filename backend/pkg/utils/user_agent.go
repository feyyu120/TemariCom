package utils

import "strings"

// ParseUserAgent automatically extracts human-readable device name and device type from User-Agent.
func ParseUserAgent(ua string) (deviceName string, deviceType string) {
	trimmed := strings.TrimSpace(ua)
	if trimmed == "" {
		return "Unknown Device", "web"
	}

	uaLower := strings.ToLower(trimmed)

	// 1. Detect Operating System / Platform
	osName := "Web"
	devType := "web"

	if strings.Contains(uaLower, "android") {
		osName = "Android"
		devType = "android"
	} else if strings.Contains(uaLower, "iphone") || strings.Contains(uaLower, "ipad") || strings.Contains(uaLower, "ipod") {
		osName = "iOS"
		devType = "ios"
	} else if strings.Contains(uaLower, "windows") || strings.Contains(uaLower, "win64") || strings.Contains(uaLower, "win32") {
		osName = "Windows"
		devType = "windows"
	} else if strings.Contains(uaLower, "macintosh") || strings.Contains(uaLower, "mac os x") {
		osName = "macOS"
		devType = "macos"
	} else if strings.Contains(uaLower, "linux") {
		osName = "Linux"
		devType = "linux"
	}

	// 2. Detect Client / Browser / Application
	clientName := "Browser"

	if strings.Contains(uaLower, "postmanruntime") || strings.Contains(uaLower, "postman") {
		clientName = "Postman Desktop"
		if devType == "web" {
			devType = "windows"
		}
		return clientName, devType
	} else if strings.Contains(uaLower, "edg/") || strings.Contains(uaLower, "edge/") {
		clientName = "Edge"
	} else if strings.Contains(uaLower, "opr/") || strings.Contains(uaLower, "opera") {
		clientName = "Opera"
	} else if strings.Contains(uaLower, "chrome/") && !strings.Contains(uaLower, "edg") && !strings.Contains(uaLower, "opr") {
		clientName = "Chrome"
	} else if strings.Contains(uaLower, "safari/") && !strings.Contains(uaLower, "chrome") {
		clientName = "Safari"
	} else if strings.Contains(uaLower, "firefox/") {
		clientName = "Firefox"
	} else if strings.Contains(uaLower, "curl/") {
		return "cURL Client", "linux"
	}

	return clientName + " on " + osName, devType
}
