package mp

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"kaoshiba/model"
)

// RegisterExamRoutes 注册小程序端试卷和考试相关路由
func RegisterExamRoutes(router *gin.RouterGroup) {
	// 试卷相关路由
	router.GET("/papers", listPapers)

	// 考试相关路由
	router.GET("/exams", listExams)
	router.POST("/exams/:id/submit", submitExam)

	// 成绩相关路由
	router.GET("/scores", listScores)
	router.GET("/scores/:id", getScoreDetail)

	// 错题本相关路由
	router.GET("/errors", listErrorQuestions)
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

// submitExam 提交考试答案
func submitExam(c *gin.Context) {
	// 获取考试ID
	examID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid exam ID",
		})
		return
	}

	// 检查考试是否存在
	exam, err := model.GetExamByID(examID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20017,
			"message": "Exam not found",
		})
		return
	}

	// 检查考试是否已结束
	if time.Now().After(exam.EndTime) {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    20022,
			"message": "Exam has ended",
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

	// 绑定请求参数
	var req struct {
		Answers    string `json:"answers" binding:"required"`
		CheatFlags string `json:"cheat_flags"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid request parameters",
			"detail":  err.Error(),
		})
		return
	}

	// 检查是否已提交
	existingSheet, err := model.GetAnswerSheetByExamAndUser(examID, userID)
	if err == nil {
		// 已提交，更新答题记录
		existingSheet.Answers = req.Answers
		existingSheet.SubmittedAt = time.Now()
		existingSheet.CheatFlags = req.CheatFlags
		// 这里可以添加自动评分逻辑
		existingSheet.AutoScore = 0 // 模拟自动评分
		existingSheet.FinalScore = existingSheet.AutoScore

		if err := model.UpdateAnswerSheet(existingSheet); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    20023,
				"message": "Failed to update answer sheet",
				"detail":  err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    0,
			"message": "ok",
			"data":    existingSheet,
		})
		return
	}

	// 首次提交，创建答题记录
	sheet := &model.AnswerSheet{
		ExamID:      examID,
		UserID:      userID,
		Answers:     req.Answers,
		AutoScore:   0, // 模拟自动评分
		ManualScore: 0,
		FinalScore:  0,
		SubmittedAt: time.Now(),
		CheatFlags:  req.CheatFlags,
	}

	if err := model.CreateAnswerSheet(sheet); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20024,
			"message": "Failed to create answer sheet",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    sheet,
	})
}

// listScores 获取成绩列表
func listScores(c *gin.Context) {
	// 获取用户信息
	_, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    10008,
			"message": "User not authenticated",
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

	// 这里应该获取用户的成绩列表
	// 为了演示，这里返回所有答题记录
	answerSheets, total, err := model.ListAnswerSheets(page, pageSize, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    20020,
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

// getScoreDetail 获取成绩详情
func getScoreDetail(c *gin.Context) {
	// 获取成绩ID
	scoreID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    10005,
			"message": "Invalid score ID",
		})
		return
	}

	// 获取答题记录
	sheet, err := model.GetAnswerSheetByID(scoreID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20025,
			"message": "Score not found",
		})
		return
	}

	// 获取考试信息
	exam, err := model.GetExamByID(sheet.ExamID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20017,
			"message": "Exam not found",
		})
		return
	}

	// 获取试卷信息
	paper, err := model.GetPaperByID(exam.PaperID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    20012,
			"message": "Paper not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data": gin.H{
			"score": sheet,
			"exam":  exam,
			"paper": paper,
		},
	})
}

// listErrorQuestions 获取错题本
func listErrorQuestions(c *gin.Context) {
	// 获取用户信息
	_, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    10008,
			"message": "User not authenticated",
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

	// 这里应该获取用户的错题列表
	// 为了演示，这里返回模拟数据
	c.JSON(http.StatusOK, gin.H{
		"code":     0,
		"message":  "ok",
		"data":     []interface{}{},
		"total":    0,
		"page":     page,
		"pageSize": pageSize,
	})
}
