package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"TemariCom/internal/research/dto"
	"TemariCom/internal/research/model"
)

var (
	ErrScholarXivRateLimit = errors.New("scholarxiv rate limit exceeded")
	ErrScholarXivBadAPIKey = errors.New("invalid or missing scholarxiv api key")
	ErrScholarXivUpstream  = errors.New("scholarxiv upstream service error")
)

type ScholarXivClient interface {
	SimpleSearch(ctx context.Context, q string, page, limit int) (*model.ScholarXivSearchResponse, error)
	AdvancedSearch(ctx context.Context, req *dto.AdvancedSearchRequest) (*model.ScholarXivSearchResponse, error)
	GetPaperByID(ctx context.Context, paperID string) (*model.ScholarXivPaper, error)
}

type scholarXivClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewScholarXivClient(baseURL, apiKey string) ScholarXivClient {
	cleanURL := strings.TrimRight(baseURL, "/")
	if cleanURL == "" {
		cleanURL = "https://www.scholarxiv.com"
	}

	return &scholarXivClient{
		baseURL: cleanURL,
		apiKey:  strings.TrimSpace(apiKey),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        50,
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}
}

// SimpleSearch executes GET /api/v1/papers/search?q=...&page=...&limit=...
func (c *scholarXivClient) SimpleSearch(ctx context.Context, q string, page, limit int) (*model.ScholarXivSearchResponse, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if page < 0 {
		page = 0
	}

	endpoint := fmt.Sprintf("%s/api/v1/papers/search", c.baseURL)
	u, err := url.Parse(endpoint)
	if err != nil {
		return nil, fmt.Errorf("invalid scholarxiv endpoint: %w", err)
	}

	vals := u.Query()
	vals.Set("q", q)
	vals.Set("page", strconv.Itoa(page))
	vals.Set("limit", strconv.Itoa(limit))
	u.RawQuery = vals.Encode()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}

	return c.executeRequest(httpReq)
}

// AdvancedSearch executes POST /api/v1/papers/search
func (c *scholarXivClient) AdvancedSearch(ctx context.Context, req *dto.AdvancedSearchRequest) (*model.ScholarXivSearchResponse, error) {
	if req.Limit <= 0 {
		req.Limit = 20
	}
	if req.Limit > 50 {
		req.Limit = 30
	}
	if req.Page < 0 {
		req.Page = 0
	}

	endpoint := fmt.Sprintf("%s/api/v1/papers/search", c.baseURL)
	bodyBytes, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal advanced search payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	return c.executeRequest(httpReq)
}

// GetPaperByID searches for a specific paper by its exact ID or arXiv ID.
func (c *scholarXivClient) GetPaperByID(ctx context.Context, paperID string) (*model.ScholarXivPaper, error) {
	cleanID := strings.TrimSpace(paperID)
	if cleanID == "" {
		return nil, errors.New("paper id is required")
	}

	req := &dto.AdvancedSearchRequest{
		SearchFilterString: map[string]string{
			"id": cleanID,
		},
		Limit: 1,
		Page:  0,
	}

	res, err := c.AdvancedSearch(ctx, req)
	if err != nil {
		return nil, err
	}

	if len(res.Data) == 0 {
		// Fallback to title search if id field returned empty
		simpleRes, err := c.SimpleSearch(ctx, cleanID, 0, 1)
		if err == nil && len(simpleRes.Data) > 0 {
			return &simpleRes.Data[0], nil
		}
		return nil, errors.New("paper not found")
	}

	return &res.Data[0], nil
}

func (c *scholarXivClient) executeRequest(req *http.Request) (*model.ScholarXivSearchResponse, error) {
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
		req.Header.Set("x-api-key", c.apiKey)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "TemariCom-Research/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("scholarxiv network error: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024)) // 10MB safety cap
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, ErrScholarXivRateLimit
	}

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return nil, ErrScholarXivBadAPIKey
	}

	if resp.StatusCode >= 500 {
		return nil, fmt.Errorf("%w: status %d", ErrScholarXivUpstream, resp.StatusCode)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("scholarxiv api error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var searchResp model.ScholarXivSearchResponse
	if err := json.Unmarshal(bodyBytes, &searchResp); err != nil {
		return nil, fmt.Errorf("failed to decode scholarxiv response: %w", err)
	}

	return &searchResp, nil
}
