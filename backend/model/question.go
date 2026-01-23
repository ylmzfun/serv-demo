package model

import (
	"database/sql"
	"errors"
	"time"
)

// Question 题目模型
type Question struct {
	ID         int       `json:"id"`
	Type       string    `json:"type"`
	Content    string    `json:"content"`
	Options    string    `json:"options"`
	Answer     string    `json:"answer"`
	Analysis   string    `json:"analysis"`
	Difficulty int       `json:"difficulty"`
	Tags       string    `json:"tags"`
	Version    int       `json:"version"`
	Media      string    `json:"media"`
	CodeBlocks string    `json:"code_blocks"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// CreateQuestion 创建新题目
func CreateQuestion(question *Question) error {
	query := `
	INSERT INTO questions (type, content, options, answer, analysis, difficulty, tags, version, media, code_blocks)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := DB.Exec(query, question.Type, question.Content, question.Options, question.Answer, question.Analysis, question.Difficulty, question.Tags, question.Version, question.Media, question.CodeBlocks)
	return err
}

// GetQuestionByID 根据ID获取题目
func GetQuestionByID(id int) (*Question, error) {
	query := `
	SELECT id, type, content, options, answer, analysis, difficulty, tags, version, media, code_blocks, created_at, updated_at
	FROM questions
	WHERE id = ?
	`
	row := DB.QueryRow(query, id)

	var question Question
	var createdAt, updatedAt string
	err := row.Scan(&question.ID, &question.Type, &question.Content, &question.Options, &question.Answer, &question.Analysis, &question.Difficulty, &question.Tags, &question.Version, &question.Media, &question.CodeBlocks, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("question not found")
		}
		return nil, err
	}

	question.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	question.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &question, nil
}

// UpdateQuestion 更新题目信息
func UpdateQuestion(question *Question) error {
	// 先获取当前版本
	var currentVersion int
	row := DB.QueryRow("SELECT version FROM questions WHERE id = ?", question.ID)
	if err := row.Scan(&currentVersion); err != nil {
		return err
	}

	// 版本号+1
	question.Version = currentVersion + 1

	query := `
	UPDATE questions
	SET type = ?, content = ?, options = ?, answer = ?, analysis = ?, difficulty = ?, tags = ?, version = ?, media = ?, code_blocks = ?, updated_at = CURRENT_TIMESTAMP
	WHERE id = ?
	`
	_, err := DB.Exec(query, question.Type, question.Content, question.Options, question.Answer, question.Analysis, question.Difficulty, question.Tags, question.Version, question.Media, question.CodeBlocks, question.ID)
	return err
}

// DeleteQuestion 删除题目
func DeleteQuestion(id int) error {
	query := "DELETE FROM questions WHERE id = ?"
	_, err := DB.Exec(query, id)
	return err
}

// ListQuestions 获取题目列表
func ListQuestions(page, pageSize int, filters map[string]interface{}) ([]*Question, int, error) {
	// 构建查询条件
	whereClause := ""
	args := []interface{}{}

	if tags, ok := filters["tags"].(string); ok && tags != "" {
		whereClause += " AND tags LIKE ?"
		args = append(args, "%"+tags+"%")
	}

	if difficulty, ok := filters["difficulty"].(int); ok && difficulty > 0 {
		whereClause += " AND difficulty = ?"
		args = append(args, difficulty)
	}

	if qType, ok := filters["type"].(string); ok && qType != "" {
		whereClause += " AND type = ?"
		args = append(args, qType)
	}

	if whereClause != "" {
		whereClause = " WHERE " + whereClause[5:]
	}

	// 获取总数
	countQuery := "SELECT COUNT(*) FROM questions" + whereClause
	var total int
	if err := DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	offset := (page - 1) * pageSize
	query := `
	SELECT id, type, content, options, answer, analysis, difficulty, tags, version, media, code_blocks, created_at, updated_at
	FROM questions
	` + whereClause + `
	ORDER BY id DESC
	LIMIT ? OFFSET ?
	`
	args = append(args, pageSize, offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var questions []*Question
	for rows.Next() {
		var question Question
		var createdAt, updatedAt string
		err := rows.Scan(&question.ID, &question.Type, &question.Content, &question.Options, &question.Answer, &question.Analysis, &question.Difficulty, &question.Tags, &question.Version, &question.Media, &question.CodeBlocks, &createdAt, &updatedAt)
		if err != nil {
			return nil, 0, err
		}
		question.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		question.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		questions = append(questions, &question)
	}

	return questions, total, nil
}
