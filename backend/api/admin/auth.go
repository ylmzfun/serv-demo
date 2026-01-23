package admin

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"kaoshiba/config"
	"kaoshiba/model"
)

// RegisterAuthRoutes 注册认证相关路由
func RegisterAuthRoutes(router *gin.RouterGroup) {
	authGroup := router.Group("/auth")
	{
		authGroup.POST("/register", register)
		authGroup.POST("/login", login)
		authGroup.POST("/logout", logout)
		authGroup.GET("/profile", getProfile)
	}
}

// register 管理员/教师注册
func register(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Nickname string `json:"nickname" binding:"required"`
		Roles    string `json:"roles" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid request parameters",
			"detail":  err.Error(),
		})
		return
	}

	// 检查用户名是否已存在
	_, err := model.GetUserByUsername(req.Username)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"code":    10006,
			"message": "Username already exists",
		})
		return
	}

	// 创建新用户
	user := &model.User{
		Username: req.Username,
		Password: req.Password, // 实际应加密存储
		Nickname: req.Nickname,
		Roles:    req.Roles,
		Status:   1,
		Level:    1,
		Score:    0,
	}

	if err := model.CreateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20001,
			"message": "Failed to create user",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    user,
	})
}

// login 管理员/教师登录
func login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid request parameters",
			"detail":  err.Error(),
		})
		return
	}

	// 获取用户信息
	user, err := model.GetUserByUsername(req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    10007,
			"message": "Invalid username or password",
		})
		return
	}

	// 检查密码
	if user.Password != req.Password { // 实际应使用密码哈希验证
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    10007,
			"message": "Invalid username or password",
		})
		return
	}

	// 检查用户状态
	if user.Status != 1 {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    11001,
			"message": "User account is disabled",
		})
		return
	}

	// 生成token
	token := uuid.New().String()

	// 将token存储到Redis
	ctx := c.Request.Context()
	config.RedisClient.Set(ctx, "admin:token:"+token, user.ID, 24*time.Hour)

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data": gin.H{
			"token": token,
			"user":  user,
		},
		"traceId": c.GetString("traceId"),
	})
}

// logout 管理员/教师退出
func logout(c *gin.Context) {
	// 从请求头获取token
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusOK, gin.H{
			"code":    0,
			"message": "ok",
		})
		return
	}

	// 解析token
	parts := strings.SplitN(authHeader, " ", 2)
	if !(len(parts) == 2 && parts[0] == "Bearer") {
		c.JSON(http.StatusOK, gin.H{
			"code":    0,
			"message": "ok",
		})
		return
	}

	token := parts[1]

	// 从Redis删除token
	ctx := c.Request.Context()
	config.RedisClient.Del(ctx, "admin:token:"+token)

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
	})
}

// getProfile 获取个人信息
func getProfile(c *gin.Context) {
	// 从上下文获取用户信息
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    10008,
			"message": "User not authenticated",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    user,
	})
}
