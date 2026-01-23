package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestID 生成请求ID中间件
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查是否已有请求ID
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			// 生成新的请求ID
			requestID = uuid.New().String()
		}

		// 设置请求ID到上下文和响应头
		c.Set("traceId", requestID)
		c.Header("X-Request-ID", requestID)

		c.Next()
	}
}
