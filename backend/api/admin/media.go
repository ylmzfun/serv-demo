package admin

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"kaoshiba/model"
)

// RegisterMediaRoutes 注册媒体管理相关路由
func RegisterMediaRoutes(router *gin.RouterGroup) {
	mediaGroup := router.Group("/media")
	{
		mediaGroup.GET("", listMedia)
		mediaGroup.POST("/upload", uploadMedia)
	}
}

// listMedia 获取媒体库列表
func listMedia(c *gin.Context) {
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

	// 获取用户ID参数
	ownerID, _ := strconv.Atoi(c.Query("owner_id"))

	// 获取媒体资源列表
	mediaList, total, err := model.ListMediaAssets(page, pageSize, ownerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    30001,
			"message": "Failed to get media list",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":     0,
		"message":  "ok",
		"data":     mediaList,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// uploadMedia 上传媒体文件
func uploadMedia(c *gin.Context) {
	// 处理文件上传
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    30002,
			"message": "No file uploaded",
			"detail":  err.Error(),
		})
		return
	}

	// 获取用户信息
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    10008,
			"message": "User not authenticated",
		})
		return
	}

	userID := user.(*model.User).ID

	// 这里可以添加文件处理逻辑
	// 例如：文件类型校验、大小限制、存储到本地或对象存储、生成哈希值等

	// 模拟创建媒体资源
	media := &model.MediaAsset{
		Type:    "image", // 实际应根据文件类型判断
		URL:     "/static/" + file.Filename, // 实际应使用真实的存储路径
		OwnerID: userID,
		Hash:    "fake-hash", // 实际应计算文件哈希值
		Size:    int(file.Size),
	}

	if err := model.CreateMediaAsset(media); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    30003,
			"message": "Failed to save media asset",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    media,
	})
}
