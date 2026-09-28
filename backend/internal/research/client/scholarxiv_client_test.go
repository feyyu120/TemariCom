package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"TemariCom/internal/research/dto"
	"TemariCom/internal/research/model"
)

func TestSimpleSearch(t *testing.T) {
	mockResponse := model.ScholarXivSearchResponse{
		Data: []model.ScholarXivPaper{
			{
				ID:          "https://arxiv.org/abs/2401.00001",
				ExtractedID: "2401.00001",
				Title:       "Attention Is All You Need",
				Summary:     "The dominant sequence transduction models...",
				Authors:     []string{"Vaswani", "Shazeer"},
			},
		},
		Pagination: model.ScholarXivPagination{
			Page:     0,
			Limit:    20,
			HasMore:  false,
			NextPage: nil,
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Errorf("expected GET, got %s", r.Method)
		}
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Errorf("expected Bearer test-key, got %s", r.Header.Get("Authorization"))
		}
		if r.URL.Query().Get("q") != "attention" {
			t.Errorf("expected query attention, got %s", r.URL.Query().Get("q"))
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	c := NewScholarXivClient(server.URL, "test-key")
	res, err := c.SimpleSearch(context.Background(), "attention", 0, 20)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(res.Data) != 1 {
		t.Fatalf("expected 1 paper, got %d", len(res.Data))
	}
	if res.Data[0].Title != "Attention Is All You Need" {
		t.Errorf("expected title Attention Is All You Need, got %s", res.Data[0].Title)
	}
}

func TestAdvancedSearch(t *testing.T) {
	mockResponse := model.ScholarXivSearchResponse{
		Data: []model.ScholarXivPaper{
			{
				ID:    "2401.00002",
				Title: "Advanced LLM Reasoning",
			},
		},
		Pagination: model.ScholarXivPagination{
			Page:    0,
			Limit:   10,
			HasMore: false,
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("expected application/json, got %s", r.Header.Get("Content-Type"))
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	c := NewScholarXivClient(server.URL, "test-key")
	res, err := c.AdvancedSearch(context.Background(), &dto.AdvancedSearchRequest{
		SearchFilterString: map[string]string{"cat": "cs.AI"},
		Limit:              10,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(res.Data) != 1 {
		t.Fatalf("expected 1 paper, got %d", len(res.Data))
	}
}

func TestRateLimitError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer server.Close()

	c := NewScholarXivClient(server.URL, "test-key")
	_, err := c.SimpleSearch(context.Background(), "test", 0, 10)
	if err != ErrScholarXivRateLimit {
		t.Fatalf("expected ErrScholarXivRateLimit, got %v", err)
	}
}
