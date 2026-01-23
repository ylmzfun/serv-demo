package model

import (
	"database/sql"
	"errors"
	"time"
)

// AnswerSheet 答题记录模型
type AnswerSheet struct {
	ID          int       `json:"id"`
	ExamID      int       `json:"exam_id"`
	UserID      int       `json:"user_id"`
	Answers     string    `json:"answers"`
	AutoScore   float64   `json:"auto_score"`
	ManualScore float64   `json:"manual_score"`
	FinalScore  float64   `json:"final_score"`
	SubmittedAt time.Time `json:"submitted_at"`
	CheatFlags  string    `json:"cheat_flags"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateAnswerSheet 创建新答题记录
func CreateAnswerSheet(sheet *AnswerSheet) error {
	query := `
	INSERT INTO answer_sheets (exam_id, user_id, answers, auto_score, manual_score, final_score, submitted_at, cheat_flags)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := DB.Exec(query, sheet.ExamID, sheet.UserID, sheet.Answers, sheet.AutoScore, sheet.ManualScore, sheet.FinalScore, sheet.SubmittedAt, sheet.CheatFlags)
	return err
}

// GetAnswerSheetByID 根据ID获取答题记录
func GetAnswerSheetByID(id int) (*AnswerSheet, error) {
	query := `
	SELECT id, exam_id, user_id, answers, auto_score, manual_score, final_score, submitted_at, cheat_flags, created_at, updated_at
	FROM answer_sheets
	WHERE id = ?
	`
	row := DB.QueryRow(query, id)

	var sheet AnswerSheet
	var submittedAt, createdAt, updatedAt string
	err := row.Scan(&sheet.ID, &sheet.ExamID, &sheet.UserID, &sheet.Answers, &sheet.AutoScore, &sheet.ManualScore, &sheet.FinalScore, &submittedAt, &sheet.CheatFlags, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("answer sheet not found")
		}
		return nil, err
	}

	sheet.SubmittedAt, _ = time.Parse(time.RFC3339, submittedAt)
	sheet.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	sheet.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &sheet, nil
}

// GetAnswerSheetByExamAndUser 根据考试ID和用户ID获取答题记录
func GetAnswerSheetByExamAndUser(examID, userID int) (*AnswerSheet, error) {
	query := `
	SELECT id, exam_id, user_id, answers, auto_score, manual_score, final_score, submitted_at, cheat_flags, created_at, updated_at
	FROM answer_sheets
	WHERE exam_id = ? AND user_id = ?
	`
	row := DB.QueryRow(query, examID, userID)

	var sheet AnswerSheet
	var submittedAt, createdAt, updatedAt string
	err := row.Scan(&sheet.ID, &sheet.ExamID, &sheet.UserID, &sheet.Answers, &sheet.AutoScore, &sheet.ManualScore, &sheet.FinalScore, &submittedAt, &sheet.CheatFlags, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("answer sheet not found")
		}
		return nil, err
	}

	sheet.SubmittedAt, _ = time.Parse(time.RFC3339, submittedAt)
	sheet.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	sheet.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &sheet, nil
}

// UpdateAnswerSheet 更新答题记录
func UpdateAnswerSheet(sheet *AnswerSheet) error {
	query := `
	UPDATE answer_sheets
	SET answers = ?, auto_score = ?, manual_score = ?, final_score = ?, submitted_at = ?, cheat_flags = ?, updated_at = CURRENT_TIMESTAMP
	WHERE id = ?
	`
	_, err := DB.Exec(query, sheet.Answers, sheet.AutoScore, sheet.ManualScore, sheet.FinalScore, sheet.SubmittedAt, sheet.CheatFlags, sheet.ID)
	return err
}

// ListAnswerSheets 获取答题记录列表
func ListAnswerSheets(page, pageSize int, examID int) ([]*AnswerSheet, int, error) {
	// 构建查询条件
	whereClause := ""
	args := []interface{}{}

	if examID > 0 {
		whereClause = " WHERE exam_id = ?"
		args = append(args, examID)
	}

	// 获取总数
	countQuery := "SELECT COUNT(*) FROM answer_sheets" + whereClause
	var total int
	if err := DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	offset := (page - 1) * pageSize
	query := `
	SELECT id, exam_id, user_id, answers, auto_score, manual_score, final_score, submitted_at, cheat_flags, created_at, updated_at
	FROM answer_sheets
	` + whereClause + `
	ORDER BY submitted_at DESC
	LIMIT ? OFFSET ?
	`
	args = append(args, pageSize, offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var sheets []*AnswerSheet
	for rows.Next() {
		var sheet AnswerSheet
		var submittedAt, createdAt, updatedAt string
		err := rows.Scan(&sheet.ID, &sheet.ExamID, &sheet.UserID, &sheet.Answers, &sheet.AutoScore, &sheet.ManualScore, &sheet.FinalScore, &submittedAt, &sheet.CheatFlags, &createdAt, &updatedAt)
		if err != nil {
			return nil, 0, err
		}
		sheet.SubmittedAt, _ = time.Parse(time.RFC3339, submittedAt)
		sheet.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		sheet.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		sheets = append(sheets, &sheet)
	}

	return sheets, total, nil
}
