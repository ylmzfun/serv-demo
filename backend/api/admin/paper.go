package admin

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"kaoshiba/model"
)

// RegisterPaperRoutes 注册试卷管理相关路由
func RegisterPaperRoutes(router *gin.RouterGroup) {
	paperGroup := router.Group("/papers")
	{
		paperGroup.GET("", listPapers)
		paperGroup.POST("", createPaper)
		paperGroup.PATCH("/:id", updatePaper)
		paperGroup.DELETE("/:id", deletePaper)
		paperGroup.POST("/:id/publish", publishPaper)
	}
}

// listPapers 获取试卷列表
func listPapers(c *gin.Context) {
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

	// 获取试卷列表
	papers, total, err := model.ListPapers(page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20010,
			"message": "Failed to get paper list",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":     0,
		"message":  "ok",
		"data":     papers,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// createPaper 创建新试卷
func createPaper(c *gin.Context) {
	var req struct {
		Title        string `json:"title" binding:"required"`
		Description  string `json:"description"`
		QuestionRefs string `json:"question_refs" binding:"required"`
		TotalScore   int    `json:"total_score" binding:"required"`
		Duration     int    `json:"duration" binding:"required"`
		Visible      string `json:"visible"`
		Shuffle      int    `json:"shuffle"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid request parameters",
			"detail":  err.Error(),
		})
		return
	}

	// 创建新试卷
	paper := &model.Paper{
		Title:        req.Title,
		Description:  req.Description,
		QuestionRefs: req.QuestionRefs,
		TotalScore:   req.TotalScore,
		Duration:     req.Duration,
		Visible:      req.Visible,
		Shuffle:      req.Shuffle,
	}

	if err := model.CreatePaper(paper); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20011,
			"message": "Failed to create paper",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    paper,
	})
}

// updatePaper 更新试卷信息
func updatePaper(c *gin.Context) {
	// 获取试卷ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid paper ID",
		})
		return
	}

	// 获取现有试卷
	paper, err := model.GetPaperByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20012,
			"message": "Paper not found",
		})
		return
	}

	// 绑定请求参数
	var req struct {
		Title        string `json:"title"`
		Description  string `json:"description"`
		QuestionRefs string `json:"question_refs"`
		TotalScore   int    `json:"total_score"`
		Duration     int    `json:"duration"`
		Visible      string `json:"visible"`
		Shuffle      int    `json:"shuffle"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid request parameters",
			"detail":  err.Error(),
		})
		return
	}

	// 更新试卷信息
	if req.Title != "" {
		paper.Title = req.Title
	}
	if req.Description != "" {
		paper.Description = req.Description
	}
	if req.QuestionRefs != "" {
		paper.QuestionRefs = req.QuestionRefs
	}
	if req.TotalScore != 0 {
		paper.TotalScore = req.TotalScore
	}
	if req.Duration != 0 {
		paper.Duration = req.Duration
	}
	if req.Visible != "" {
		paper.Visible = req.Visible
	}
	if req.Shuffle != 0 {
		paper.Shuffle = req.Shuffle
	}

	if err := model.UpdatePaper(paper); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20013,
			"message": "Failed to update paper",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    paper,
	})
}

// deletePaper 删除试卷
func deletePaper(c *gin.Context) {
	// 获取试卷ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid paper ID",
		})
		return
	}

	// 检查试卷是否存在
	_, err = model.GetPaperByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20012,
			"message": "Paper not found",
		})
		return
	}

	// 删除试卷
	if err := model.DeletePaper(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20014,
			"message": "Failed to delete paper",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
	})
}

// publishPaper 发布/撤销发布试卷
func publishPaper(c *gin.Context) {
	// 获取试卷ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid paper ID",
		})
		return
	}

	// 检查试卷是否存在
	_, err = model.GetPaperByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20012,
			"message": "Paper not found",
		})
		return
	}

	// 绑定请求参数
	var req struct {
		Published bool `json:"published" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid request parameters",
			"detail":  err.Error(),
		})
		return
	}

	// 这里可以添加发布/撤销发布的逻辑
	// 例如生成只读快照、更新试卷状态等

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data": gin.H{
			"paper_id":  id,
			"published": req.Published,
		},
	})
}
