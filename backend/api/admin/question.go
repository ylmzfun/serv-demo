package admin

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"kaoshiba/model"
)

// RegisterQuestionRoutes 注册题目管理相关路由
func RegisterQuestionRoutes(router *gin.RouterGroup) {
	questionGroup := router.Group("/questions")
	{
		questionGroup.GET("", listQuestions)
		questionGroup.POST("", createQuestion)
		questionGroup.PATCH("/:id", updateQuestion)
		questionGroup.DELETE("/:id", deleteQuestion)
	}
}

// listQuestions 获取题目列表
func listQuestions(c *gin.Context) {
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

	// 获取过滤参数
	filters := make(map[string]interface{})

	if tags := c.Query("tags"); tags != "" {
		filters["tags"] = tags
	}

	if difficulty := c.Query("difficulty"); difficulty != "" {
		if d, err := strconv.Atoi(difficulty); err == nil {
			filters["difficulty"] = d
		}
	}

	if qType := c.Query("type"); qType != "" {
		filters["type"] = qType
	}

	// 获取题目列表
	questions, total, err := model.ListQuestions(page, pageSize, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20005,
			"message": "Failed to get question list",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":     0,
		"message":  "ok",
		"data":     questions,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// createQuestion 创建新题目
func createQuestion(c *gin.Context) {
	var req struct {
		Type       string   `json:"type" binding:"required"`
		Content    string   `json:"content" binding:"required"`
		Options    []string `json:"options"`
		Answer     string   `json:"answer" binding:"required"`
		Analysis   string   `json:"analysis"`
		Difficulty int      `json:"difficulty"`
		Tags       string   `json:"tags"`
		Media      string   `json:"media"`
		CodeBlocks string   `json:"code_blocks"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid request parameters",
			"detail":  err.Error(),
		})
		return
	}

	// 将options数组转换为字符串
	optionsStr := ""
	if len(req.Options) > 0 {
		optionsStr = "[" + strings.Join(req.Options, ",") + "]"
	}

	// 创建新题目
	question := &model.Question{
		Type:       req.Type,
		Content:    req.Content,
		Options:    optionsStr,
		Answer:     req.Answer,
		Analysis:   req.Analysis,
		Difficulty: req.Difficulty,
		Tags:       req.Tags,
		Version:    1,
		Media:      req.Media,
		CodeBlocks: req.CodeBlocks,
	}

	if err := model.CreateQuestion(question); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20006,
			"message": "Failed to create question",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    question,
	})
}

// updateQuestion 更新题目信息
func updateQuestion(c *gin.Context) {
	// 获取题目ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid question ID",
		})
		return
	}

	// 获取现有题目
	question, err := model.GetQuestionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20007,
			"message": "Question not found",
		})
		return
	}

	// 绑定请求参数
	var req struct {
		Type       string `json:"type"`
		Content    string `json:"content"`
		Options    string `json:"options"`
		Answer     string `json:"answer"`
		Analysis   string `json:"analysis"`
		Difficulty int    `json:"difficulty"`
		Tags       string `json:"tags"`
		Media      string `json:"media"`
		CodeBlocks string `json:"code_blocks"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid request parameters",
			"detail":  err.Error(),
		})
		return
	}

	// 更新题目信息
	if req.Type != "" {
		question.Type = req.Type
	}
	if req.Content != "" {
		question.Content = req.Content
	}
	if req.Options != "" {
		question.Options = req.Options
	}
	if req.Answer != "" {
		question.Answer = req.Answer
	}
	if req.Analysis != "" {
		question.Analysis = req.Analysis
	}
	if req.Difficulty != 0 {
		question.Difficulty = req.Difficulty
	}
	if req.Tags != "" {
		question.Tags = req.Tags
	}
	if req.Media != "" {
		question.Media = req.Media
	}
	if req.CodeBlocks != "" {
		question.CodeBlocks = req.CodeBlocks
	}

	// 更新题目（会自动增加版本号）
	if err := model.UpdateQuestion(question); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20008,
			"message": "Failed to update question",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    question,
	})
}

// deleteQuestion 删除题目
func deleteQuestion(c *gin.Context) {
	// 获取题目ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid question ID",
		})
		return
	}

	// 检查题目是否存在
	_, err = model.GetQuestionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20007,
			"message": "Question not found",
		})
		return
	}

	// 删除题目
	if err := model.DeleteQuestion(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20009,
			"message": "Failed to delete question",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
	})
}
