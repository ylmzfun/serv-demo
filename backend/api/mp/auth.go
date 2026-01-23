package mp

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"kaoshiba/config"
	"kaoshiba/model"
)

// RegisterAuthRoutes 注册小程序端认证相关路由
func RegisterAuthRoutes(router *gin.RouterGroup) {
	authGroup := router.Group("/auth")
	{
		authGroup.POST("/login", login)
		authGroup.POST("/logout", logout)
	}
}

// login 小程序端微信登录
func login(c *gin.Context) {
	var req struct {
		Code     string `json:"code" binding:"required"`
		Nickname string `json:"nickname"`
		Avatar   string `json:"avatar"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid request parameters",
			"detail":  err.Error(),
		})
		return
	}

	// 这里应该调用微信接口获取openid和unionid
	// 为了演示，这里使用模拟数据
	openid := "mock_openid_" + req.Code
	unionid := "mock_unionid_" + req.Code

	// 检查用户是否已存在
	user, err := model.GetUserByOpenID(openid)
	if err != nil {
		// 用户不存在，创建新用户
		user = &model.User{
			OpenID:   openid,
			UnionID:  unionid,
			Nickname: req.Nickname,
			Avatar:   req.Avatar,
			Status:   1,
			Level:    1,
			Score:    0,
			Roles:    "student",
		}

		if err := model.CreateUser(user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    20001,
				"message": "Failed to create user",
				"detail":  err.Error(),
			})
			return
		}
	} else {
		// 用户存在，更新用户信息
		if req.Nickname != "" {
			user.Nickname = req.Nickname
		}
		if req.Avatar != "" {
			user.Avatar = req.Avatar
		}

		if err := model.UpdateUser(user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    20003,
				"message": "Failed to update user",
				"detail":  err.Error(),
			})
			return
		}
	}

	// 生成token
	token := uuid.New().String()

	// 将token存储到Redis
	ctx := c.Request.Context()
	config.RedisClient.Set(ctx, "mp:token:"+token, user.ID, 24*time.Hour)

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

// logout 小程序端退出登录
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
	config.RedisClient.Del(ctx, "mp:token:"+token)

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
	})
}
