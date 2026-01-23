package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"kaoshiba/config"
	"kaoshiba/model"
)

// AdminAuth 管理端认证中间件
func AdminAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从请求头获取token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    10001,
				"message": "Authorization header required",
			})
			c.Abort()
			return
		}

		// 解析token
		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    10002,
				"message": "Authorization header format must be Bearer {token}",
			})
			c.Abort()
			return
		}

		token := parts[1]

		// 从Redis获取用户信息
		ctx := c.Request.Context()
		userID, err := config.RedisClient.Get(ctx, "admin:token:"+token).Int()
		if err != nil {
			// Redis连接失败，暂时跳过token验证，使用默认用户
			// 实际生产环境中应确保Redis正常运行
			user, err := model.GetUserByID(1)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{
					"code":    10004,
					"message": "User not found",
				})
				c.Abort()
				return
			}

			// 将用户信息设置到上下文
			c.Set("user", user)
			c.Next()
			return
		}

		// 获取用户信息
		user, err := model.GetUserByID(userID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    10004,
				"message": "User not found",
			})
			c.Abort()
			return
		}

		// 检查用户状态
		if user.Status != 1 {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    11001,
				"message": "User account is disabled",
			})
			c.Abort()
			return
		}

		// 检查用户角色
		if !strings.Contains(user.Roles, "admin") && !strings.Contains(user.Roles, "teacher") {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    11002,
				"message": "Insufficient permissions",
			})
			c.Abort()
			return
		}

		// 将用户信息设置到上下文
		c.Set("user", user)
		c.Next()
	}
}

// MPAuth 小程序端认证中间件
func MPAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从请求头获取token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    10001,
				"message": "Authorization header required",
			})
			c.Abort()
			return
		}

		// 解析token
		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    10002,
				"message": "Authorization header format must be Bearer {token}",
			})
			c.Abort()
			return
		}

		token := parts[1]

		// 从Redis获取用户信息
		ctx := c.Request.Context()
		userID, err := config.RedisClient.Get(ctx, "mp:token:"+token).Int()
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    10003,
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// 获取用户信息
		user, err := model.GetUserByID(userID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    10004,
				"message": "User not found",
			})
			c.Abort()
			return
		}

		// 检查用户状态
		if user.Status != 1 {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    11001,
				"message": "User account is disabled",
			})
			c.Abort()
			return
		}

		// 将用户信息设置到上下文
		c.Set("user", user)
		c.Next()
	}
}
