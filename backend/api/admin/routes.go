package admin

import (
	"github.com/gin-gonic/gin"

	"kaoshiba/middleware"
)

// RegisterRoutes 注册管理端所有API路由
func RegisterRoutes(router *gin.RouterGroup) {
	// 注册认证路由（不需要认证中间件）
	RegisterAuthRoutes(router)

	// 需要认证的路由组
	authGroup := router.Group("/")
	authGroup.Use(middleware.AdminAuth())
	{
		// 注册用户管理路由
		RegisterUserRoutes(authGroup)

		// 注册题目管理路由
		RegisterQuestionRoutes(authGroup)

		// 注册试卷管理路由
		RegisterPaperRoutes(authGroup)

		// 注册考试管理路由
		RegisterExamRoutes(authGroup)

		// 注册媒体管理路由
		RegisterMediaRoutes(authGroup)
	}
}
