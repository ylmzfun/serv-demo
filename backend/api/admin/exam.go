package admin

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"kaoshiba/model"
)

// RegisterExamRoutes 注册考试管理相关路由
func RegisterExamRoutes(router *gin.RouterGroup) {
	examGroup := router.Group("/exams")
	{
		examGroup.GET("", listExams)
		examGroup.POST("", createExam)
		examGroup.PATCH("/:id", updateExam)
		examGroup.DELETE("/:id", deleteExam)
		examGroup.GET("/:id/scoreboard", getScoreboard)
	}

	// 成绩管理路由
	scoreGroup := router.Group("/scores")
	{
		scoreGroup.GET("", listScores)
	}
}

// listExams 获取考试列表
func listExams(c *gin.Context) {
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

	// 获取考试列表
	exams, total, err := model.ListExams(page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20015,
			"message": "Failed to get exam list",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":     0,
		"message":  "ok",
		"data":     exams,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// createExam 创建新考试
func createExam(c *gin.Context) {
	var req struct {
		PaperID   int       `json:"paper_id" binding:"required"`
		StartTime time.Time `json:"start_time" binding:"required"`
		EndTime   time.Time `json:"end_time" binding:"required"`
		Status    string    `json:"status"`
		Limit     string    `json:"limit"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid request parameters",
			"detail":  err.Error(),
		})
		return
	}

	// 检查试卷是否存在
	_, err := model.GetPaperByID(req.PaperID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20012,
			"message": "Paper not found",
		})
		return
	}

	// 创建新考试
	exam := &model.Exam{
		PaperID:   req.PaperID,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		Status:    req.Status,
		Limit:     req.Limit,
	}

	if err := model.CreateExam(exam); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20016,
			"message": "Failed to create exam",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    exam,
	})
}

// updateExam 更新考试信息
func updateExam(c *gin.Context) {
	// 获取考试ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid exam ID",
		})
		return
	}

	// 获取现有考试
	exam, err := model.GetExamByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20017,
			"message": "Exam not found",
		})
		return
	}

	// 绑定请求参数
	var req struct {
		PaperID   int       `json:"paper_id"`
		StartTime time.Time `json:"start_time"`
		EndTime   time.Time `json:"end_time"`
		Status    string    `json:"status"`
		Limit     string    `json:"limit"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid request parameters",
			"detail":  err.Error(),
		})
		return
	}

	// 更新考试信息
	if req.PaperID != 0 {
		exam.PaperID = req.PaperID
	}
	if !req.StartTime.IsZero() {
		exam.StartTime = req.StartTime
	}
	if !req.EndTime.IsZero() {
		exam.EndTime = req.EndTime
	}
	if req.Status != "" {
		exam.Status = req.Status
	}
	if req.Limit != "" {
		exam.Limit = req.Limit
	}

	if err := model.UpdateExam(exam); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20018,
			"message": "Failed to update exam",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    exam,
	})
}

// deleteExam 删除考试
func deleteExam(c *gin.Context) {
	// 获取考试ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid exam ID",
		})
		return
	}

	// 检查考试是否存在
	_, err = model.GetExamByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20017,
			"message": "Exam not found",
		})
		return
	}

	// 删除考试
	if err := model.DeleteExam(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20019,
			"message": "Failed to delete exam",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
	})
}

// getScoreboard 获取考试排名
func getScoreboard(c *gin.Context) {
	// 获取考试ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid exam ID",
		})
		return
	}

	// 检查考试是否存在
	_, err = model.GetExamByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20017,
			"message": "Exam not found",
		})
		return
	}

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

	// 获取答题记录列表
	answerSheets, total, err := model.ListAnswerSheets(page, pageSize, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20020,
			"message": "Failed to get scoreboard",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":     0,
		"message":  "ok",
		"data":     answerSheets,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// listScores 获取成绩列表
func listScores(c *gin.Context) {
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

	// 获取考试ID参数
	examID, _ := strconv.Atoi(c.Query("exam_id"))

	// 获取答题记录列表
	answerSheets, total, err := model.ListAnswerSheets(page, pageSize, examID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20021,
			"message": "Failed to get score list",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":     0,
		"message":  "ok",
		"data":     answerSheets,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}
