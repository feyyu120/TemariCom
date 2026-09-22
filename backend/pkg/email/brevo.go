package email

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

var (
	ErrBrevoMissingKey     = errors.New("brevo API key is required")
	ErrBrevoInvalidEmail   = errors.New("recipient email address cannot be empty")
	ErrBrevoDeliveryFailed = errors.New("failed to deliver email via Brevo")
)

type EmailService interface {
	SendEmail(to string, subject, htmlBody string) (string, error)
	SendOTP(to string, otpCode, purpose string) (string, error)
}

type BrevoSender struct {

	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}

type BrevoRecipient struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}

type BrevoSendEmailRequest struct {
	Sender      BrevoSender      `json:"sender"`
	To          []BrevoRecipient `json:"to"`
	Subject     string           `json:"subject"`
	HTMLContent string           `json:"htmlContent"`
}

type BrevoSendEmailResponse struct {
	MessageID string `json:"messageId"`
	Code      string `json:"code,omitempty"`
	Message   string `json:"message,omitempty"`
}

type brevoEmailService struct {
	apiKey     string
	senderName string
	senderMail string
	httpClient *http.Client
}

// NewBrevoEmailService initializes a Brevo transactional email service client.
func NewBrevoEmailService(apiKey, senderEmail, senderName string) (EmailService, error) {
	cleanKey := strings.TrimSpace(apiKey)
	if cleanKey == "" {
		return nil, ErrBrevoMissingKey
	}

	cleanSender := strings.TrimSpace(senderEmail)
	if cleanSender == "" {
		cleanSender = "contact@temaricom.com"
	}

	cleanName := strings.TrimSpace(senderName)
	if cleanName == "" {
		cleanName = "TemariCom"
	}

	return &brevoEmailService{
		apiKey:     cleanKey,
		senderName: cleanName,
		senderMail: cleanSender,
		httpClient: &http.Client{
			Timeout: 12 * time.Second,
		},
	}, nil
}

// SendEmail sends a transactional email via Brevo REST API v3 (POST https://api.brevo.com/v3/smtp/email).
func (s *brevoEmailService) SendEmail(to string, subject, htmlBody string) (string, error) {
	recipient := strings.TrimSpace(to)
	if recipient == "" {
		return "", ErrBrevoInvalidEmail
	}

	payload := BrevoSendEmailRequest{
		Sender: BrevoSender{
			Name:  s.senderName,
			Email: s.senderMail,
		},
		To: []BrevoRecipient{
			{
				Email: recipient,
			},
		},
		Subject:     strings.TrimSpace(subject),
		HTMLContent: htmlBody,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal Brevo payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.brevo.com/v3/smtp/email", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create HTTP request for Brevo: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("api-key", s.apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		log.Printf("[Brevo] Network error connecting to Brevo API: %v", err)
		return "", fmt.Errorf("%w: %v", ErrBrevoDeliveryFailed, err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		var errResp BrevoSendEmailResponse
		_ = json.Unmarshal(respBody, &errResp)

		errMsg := errResp.Message
		if errMsg == "" {
			errMsg = string(respBody)
		}

		if strings.HasPrefix(s.apiKey, "xsmtpsib-") && resp.StatusCode == http.StatusUnauthorized {
			log.Printf("[Brevo Configuration Error] The key in BREVO_API_KEY starts with 'xsmtpsib-', which is an SMTP Relay password. Brevo REST API requires an API key starting with 'xkeysib-'. Please generate an API Key in Brevo -> SMTP & API -> API Keys tab.")
		}

		log.Printf("[Brevo] Error sending email (HTTP %d): %s", resp.StatusCode, errMsg)
		return "", fmt.Errorf("brevo API error (HTTP %d): %s", resp.StatusCode, errMsg)
	}

	var successResp BrevoSendEmailResponse
	_ = json.Unmarshal(respBody, &successResp)

	log.Printf("[Brevo] Email successfully delivered to %s (Message ID: %s)", recipient, successResp.MessageID)
	return successResp.MessageID, nil
}

// SendOTP sends a styled verification code email using Brevo.
func (s *brevoEmailService) SendOTP(to string, otpCode, purpose string) (string, error) {
	subject := fmt.Sprintf("Your TemariCom Verification Code: %s", otpCode)
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TemariCom Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f8; padding: 40px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 32px; text-align: center;">
                    <tr>
                        <td>
                            <h1 style="color: #1a1f36; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">TemariCom</h1>
                            <p style="color: #4f566b; font-size: 15px; line-height: 24px; margin: 0 0 24px 0;">
                                Use the verification code below to complete your %s on <strong>TemariCom</strong>.
                            </p>
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 0 0 24px 0;">
                                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">%s</span>
                            </div>
                            <p style="color: #697386; font-size: 13px; line-height: 20px; margin: 0 0 16px 0;">
                                This code is valid for <strong>5 minutes</strong>. If you did not request this code, you can safely ignore this email.
                            </p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                            <p style="color: #a3acb9; font-size: 12px; margin: 0;">
                                &copy; TemariCom. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`, strings.ToLower(purpose), otpCode)

	return s.SendEmail(to, subject, htmlBody)
}
