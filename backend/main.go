package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"kaoshiba/api/admin"
	"kaoshiba/api/mp"
	"kaoshiba/config"
	"kaoshiba/middleware"
	"kaoshiba/model"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	// 初始化数据库
	if err := model.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// 初始化Redis
	if err := config.InitRedis(); err != nil {
		log.Printf("Warning: Failed to initialize Redis: %v", err)
		log.Println("Server will continue to run without Redis")
	}

	// 设置Gin模式
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建Gin引擎
	r := gin.Default()

	// 配置CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 注册中间件
	r.Use(middleware.RequestID())

	// 静态文件服务
	r.Static("/static", "./static")

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// 注册管理端API路由
	adminGroup := r.Group("/api/admin")
	admin.RegisterRoutes(adminGroup)

	// 注册小程序端API路由
	mpGroup := r.Group("/api/mp")
	mp.RegisterRoutes(mpGroup)

	// 获取端口
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 启动服务器
	fmt.Printf("Server running on port %s\n", port)
	if err := r.Run(fmt.Sprintf(":%s", port)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
