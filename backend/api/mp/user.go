package mp

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"kaoshiba/model"
)

// RegisterUserRoutes 注册小程序端用户相关路由
func RegisterUserRoutes(router *gin.RouterGroup) {
	userGroup := router.Group("/me")
	{
		userGroup.GET("", getProfile)
		userGroup.PATCH("", updateProfile)
	}
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

// updateProfile 更新个人信息
func updateProfile(c *gin.Context) {
	// 从上下文获取用户信息
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    10008,
			"message": "User not authenticated",
		})
		return
	}

	currentUser := user.(*model.User)

	// 绑定请求参数
	var req struct {
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

	// 更新用户信息
	if req.Nickname != "" {
		currentUser.Nickname = req.Nickname
	}
	if req.Avatar != "" {
		currentUser.Avatar = req.Avatar
	}

	if err := model.UpdateUser(currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20003,
			"message": "Failed to update user",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    currentUser,
	})
}
