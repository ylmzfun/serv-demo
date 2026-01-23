package mp

import (
	"github.com/gin-gonic/gin"

	"kaoshiba/middleware"
)

// RegisterRoutes 注册小程序端所有API路由
func RegisterRoutes(router *gin.RouterGroup) {
	// 注册认证路由（不需要认证中间件）
	RegisterAuthRoutes(router)

	// 需要认证的路由组
	authGroup := router.Group("/")
	authGroup.Use(middleware.MPAuth())
	{
		// 注册用户相关路由
		RegisterUserRoutes(authGroup)

		// 注册试卷和考试相关路由
		RegisterExamRoutes(authGroup)
	}
}
