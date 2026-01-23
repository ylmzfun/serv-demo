package model

import (
	"database/sql"
	"errors"
	"time"
)

// Paper 试卷模型
type Paper struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	QuestionRefs string    `json:"question_refs"`
	TotalScore  int       `json:"total_score"`
	Duration    int       `json:"duration"`
	Visible     string    `json:"visible"`
	Shuffle     int       `json:"shuffle"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreatePaper 创建新试卷
func CreatePaper(paper *Paper) error {
	query := `
	INSERT INTO papers (title, description, question_refs, total_score, duration, visible, shuffle)
	VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	_, err := DB.Exec(query, paper.Title, paper.Description, paper.QuestionRefs, paper.TotalScore, paper.Duration, paper.Visible, paper.Shuffle)
	return err
}

// GetPaperByID 根据ID获取试卷
func GetPaperByID(id int) (*Paper, error) {
	query := `
	SELECT id, title, description, question_refs, total_score, duration, visible, shuffle, created_at, updated_at
	FROM papers
	WHERE id = ?
	`
	row := DB.QueryRow(query, id)

	var paper Paper
	var createdAt, updatedAt string
	err := row.Scan(&paper.ID, &paper.Title, &paper.Description, &paper.QuestionRefs, &paper.TotalScore, &paper.Duration, &paper.Visible, &paper.Shuffle, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("paper not found")
		}
		return nil, err
	}

	paper.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	paper.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &paper, nil
}

// UpdatePaper 更新试卷信息
func UpdatePaper(paper *Paper) error {
	query := `
	UPDATE papers
	SET title = ?, description = ?, question_refs = ?, total_score = ?, duration = ?, visible = ?, shuffle = ?, updated_at = CURRENT_TIMESTAMP
	WHERE id = ?
	`
	_, err := DB.Exec(query, paper.Title, paper.Description, paper.QuestionRefs, paper.TotalScore, paper.Duration, paper.Visible, paper.Shuffle, paper.ID)
	return err
}

// DeletePaper 删除试卷
func DeletePaper(id int) error {
	query := "DELETE FROM papers WHERE id = ?"
	_, err := DB.Exec(query, id)
	return err
}

// ListPapers 获取试卷列表
func ListPapers(page, pageSize int) ([]*Paper, int, error) {
	// 获取总数
	countQuery := "SELECT COUNT(*) FROM papers"
	var total int
	if err := DB.QueryRow(countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	offset := (page - 1) * pageSize
	query := `
	SELECT id, title, description, question_refs, total_score, duration, visible, shuffle, created_at, updated_at
	FROM papers
	ORDER BY id DESC
	LIMIT ? OFFSET ?
	`
	rows, err := DB.Query(query, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var papers []*Paper
	for rows.Next() {
		var paper Paper
		var createdAt, updatedAt string
		err := rows.Scan(&paper.ID, &paper.Title, &paper.Description, &paper.QuestionRefs, &paper.TotalScore, &paper.Duration, &paper.Visible, &paper.Shuffle, &createdAt, &updatedAt)
		if err != nil {
			return nil, 0, err
		}
		paper.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		paper.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		papers = append(papers, &paper)
	}

	return papers, total, nil
}
