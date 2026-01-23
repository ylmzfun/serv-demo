package config

import (
	"context"
	"os"

	"github.com/go-redis/redis/v8"
)

var RedisClient *redis.Client

// InitRedis 初始化Redis连接
func InitRedis() error {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}
	db := 0

	RedisClient = redis.NewClient(&redis.Options{
		Addr: addr,
		DB:   db,
	})

	// 测试连接
	ctx := context.Background()
	_, err := RedisClient.Ping(ctx).Result()
	return err
}

// GetRedisClient 获取Redis客户端
func GetRedisClient() *redis.Client {
	return RedisClient
}
