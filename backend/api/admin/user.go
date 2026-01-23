package admin

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"kaoshiba/model"
)

// RegisterUserRoutes 注册用户管理相关路由
func RegisterUserRoutes(router *gin.RouterGroup) {
	userGroup := router.Group("/users")
	{
		userGroup.GET("", listUsers)
		userGroup.POST("", createUser)
		userGroup.PATCH("/:id", updateUser)
		userGroup.DELETE("/:id", deleteUser)
	}
}

// listUsers 获取用户列表
func listUsers(c *gin.Context) {
	// 获取分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	// 确保分页参数有效
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	// 获取用户列表
	users, total, err := model.ListUsers(page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20002,
			"message": "Failed to get user list",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":     0,
		"message":  "ok",
		"data":     users,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// createUser 创建新用户
func createUser(c *gin.Context) {
	var req struct {
		OpenID    string `json:"openid"`
		UnionID   string `json:"unionid"`
		Username  string `json:"username"`
		Password  string `json:"password"`
		Nickname  string `json:"nickname" binding:"required"`
		Avatar    string `json:"avatar"`
		Status    int    `json:"status"`
		Level     int    `json:"level"`
		Score     int    `json:"score"`
		Roles     string `json:"roles" binding:"required"`
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
	if req.Username != "" {
		_, err := model.GetUserByUsername(req.Username)
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{
				"code":    10006,
				"message": "Username already exists",
			})
			return
		}
	}

	// 检查OpenID是否已存在
	if req.OpenID != "" {
		_, err := model.GetUserByOpenID(req.OpenID)
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{
				"code":    10009,
				"message": "OpenID already exists",
			})
			return
		}
	}

	// 创建新用户
	user := &model.User{
		OpenID:   req.OpenID,
		UnionID:  req.UnionID,
		Username: req.Username,
		Password: req.Password, // 实际应加密存储
		Nickname: req.Nickname,
		Avatar:   req.Avatar,
		Status:   req.Status,
		Level:    req.Level,
		Score:    req.Score,
		Roles:    req.Roles,
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

// updateUser 更新用户信息
func updateUser(c *gin.Context) {
	// 获取用户ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid user ID",
		})
		return
	}

	// 获取现有用户
	user, err := model.GetUserByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    10004,
			"message": "User not found",
		})
		return
	}

	// 绑定请求参数
	var req struct {
		OpenID    string `json:"openid"`
		UnionID   string `json:"unionid"`
		Username  string `json:"username"`
		Password  string `json:"password"`
		Nickname  string `json:"nickname"`
		Avatar    string `json:"avatar"`
		Status    int    `json:"status"`
		Level     int    `json:"level"`
		Score     int    `json:"score"`
		Roles     string `json:"roles"`
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
	if req.OpenID != "" {
		user.OpenID = req.OpenID
	}
	if req.UnionID != "" {
		user.UnionID = req.UnionID
	}
	if req.Username != "" {
		user.Username = req.Username
	}
	if req.Password != "" {
		user.Password = req.Password // 实际应加密存储
	}
	if req.Nickname != "" {
		user.Nickname = req.Nickname
	}
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}
	if req.Status != 0 {
		user.Status = req.Status
	}
	if req.Level != 0 {
		user.Level = req.Level
	}
	if req.Score != 0 {
		user.Score = req.Score
	}
	if req.Roles != "" {
		user.Roles = req.Roles
	}

	if err := model.UpdateUser(user); err != nil {
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
		"data":    user,
	})
}

// deleteUser 删除用户
func deleteUser(c *gin.Context) {
	// 获取用户ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid user ID",
		})
		return
	}

	// 检查用户是否存在
	_, err = model.GetUserByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    10004,
			"message": "User not found",
		})
		return
	}

	// 删除用户
	if err := model.DeleteUser(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20004,
			"message": "Failed to delete user",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
	})
}
