package storage

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type R2Client struct {
	Client        *s3.Client
	PresignClient *s3.PresignClient
	BucketName    string
	MediaBaseURL  string
}

type R2Config struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	MediaBaseURL    string
}

func NewR2Client(cfg R2Config) (*R2Client, error) {
	endpoint := fmt.Sprintf(
		"https://%s.r2.cloudflarestorage.com",
		cfg.AccountID,
	)

	awsCfg, err := config.LoadDefaultConfig(
		context.Background(),
		config.WithRegion("auto"),
		config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(
				cfg.AccessKeyID,
				cfg.SecretAccessKey,
				"",
			),
		),
	)

	if err != nil {
		return nil, fmt.Errorf("load R2 config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(endpoint)
	})

	presignClient := s3.NewPresignClient(client)

	return &R2Client{
		Client:        client,
		PresignClient: presignClient,
		BucketName:    cfg.BucketName,
		MediaBaseURL:  cfg.MediaBaseURL,
	}, nil
}
