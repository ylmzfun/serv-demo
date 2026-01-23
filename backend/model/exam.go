package model

import (
	"database/sql"
	"errors"
	"time"
)

// Exam 考试模型
type Exam struct {
	ID        int       `json:"id"`
	PaperID   int       `json:"paper_id"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	Status    string    `json:"status"`
	Limit     string    `json:"limit"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateExam 创建新考试
func CreateExam(exam *Exam) error {
	query := `
	INSERT INTO exams (paper_id, start_time, end_time, status, exam_limit)
	VALUES (?, ?, ?, ?, ?)
	`
	_, err := DB.Exec(query, exam.PaperID, exam.StartTime, exam.EndTime, exam.Status, exam.Limit)
	return err
}

// GetExamByID 根据ID获取考试
func GetExamByID(id int) (*Exam, error) {
	query := `
	SELECT id, paper_id, start_time, end_time, status, exam_limit, created_at, updated_at
	FROM exams
	WHERE id = ?
	`
	row := DB.QueryRow(query, id)

	var exam Exam
	var startTime, endTime, createdAt, updatedAt string
	err := row.Scan(&exam.ID, &exam.PaperID, &startTime, &endTime, &exam.Status, &exam.Limit, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("exam not found")
		}
		return nil, err
	}

	exam.StartTime, _ = time.Parse(time.RFC3339, startTime)
	exam.EndTime, _ = time.Parse(time.RFC3339, endTime)
	exam.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	exam.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &exam, nil
}

// UpdateExam 更新考试信息
func UpdateExam(exam *Exam) error {
	query := `
	UPDATE exams
	SET paper_id = ?, start_time = ?, end_time = ?, status = ?, exam_limit = ?, updated_at = CURRENT_TIMESTAMP
	WHERE id = ?
	`
	_, err := DB.Exec(query, exam.PaperID, exam.StartTime, exam.EndTime, exam.Status, exam.Limit, exam.ID)
	return err
}

// DeleteExam 删除考试
func DeleteExam(id int) error {
	query := "DELETE FROM exams WHERE id = ?"
	_, err := DB.Exec(query, id)
	return err
}

// ListExams 获取考试列表
func ListExams(page, pageSize int) ([]*Exam, int, error) {
	// 获取总数
	countQuery := "SELECT COUNT(*) FROM exams"
	var total int
	if err := DB.QueryRow(countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	offset := (page - 1) * pageSize
	query := `
	SELECT id, paper_id, start_time, end_time, status, exam_limit, created_at, updated_at
	FROM exams
	ORDER BY id DESC
	LIMIT ? OFFSET ?
	`
	rows, err := DB.Query(query, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var exams []*Exam
	for rows.Next() {
		var exam Exam
		var startTime, endTime, createdAt, updatedAt string
		err := rows.Scan(&exam.ID, &exam.PaperID, &startTime, &endTime, &exam.Status, &exam.Limit, &createdAt, &updatedAt)
		if err != nil {
			return nil, 0, err
		}
		exam.StartTime, _ = time.Parse(time.RFC3339, startTime)
		exam.EndTime, _ = time.Parse(time.RFC3339, endTime)
		exam.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		exam.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		exams = append(exams, &exam)
	}

	return exams, total, nil
}
