package model

import (
	"database/sql"
	"errors"
	"time"
)

// User 用户模型
type User struct {
	ID        int       `json:"id"`
	OpenID    string    `json:"openid"`
	UnionID   string    `json:"unionid"`
	Username  string    `json:"username"`
	Password  string    `json:"password,omitempty"`
	Nickname  string    `json:"nickname"`
	Avatar    string    `json:"avatar"`
	Status    int       `json:"status"`
	Level     int       `json:"level"`
	Score     int       `json:"score"`
	Roles     string    `json:"roles"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateUser 创建新用户
func CreateUser(user *User) error {
	query := `
	INSERT INTO users (openid, unionid, username, password, nickname, avatar, status, level, score, roles)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := DB.Exec(query, user.OpenID, user.UnionID, user.Username, user.Password, user.Nickname, user.Avatar, user.Status, user.Level, user.Score, user.Roles)
	return err
}

// GetUserByID 根据ID获取用户
func GetUserByID(id int) (*User, error) {
	query := `
	SELECT id, openid, unionid, username, nickname, avatar, status, level, score, roles, created_at, updated_at
	FROM users
	WHERE id = ?
	`
	row := DB.QueryRow(query, id)

	var user User
	var createdAt, updatedAt string
	err := row.Scan(&user.ID, &user.OpenID, &user.UnionID, &user.Username, &user.Nickname, &user.Avatar, &user.Status, &user.Level, &user.Score, &user.Roles, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	user.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &user, nil
}

// GetUserByUsername 根据用户名获取用户
func GetUserByUsername(username string) (*User, error) {
	query := `
	SELECT id, openid, unionid, username, password, nickname, avatar, status, level, score, roles, created_at, updated_at
	FROM users
	WHERE username = ?
	`
	row := DB.QueryRow(query, username)

	var user User
	var createdAt, updatedAt string
	err := row.Scan(&user.ID, &user.OpenID, &user.UnionID, &user.Username, &user.Password, &user.Nickname, &user.Avatar, &user.Status, &user.Level, &user.Score, &user.Roles, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	user.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &user, nil
}

// GetUserByOpenID 根据OpenID获取用户
func GetUserByOpenID(openid string) (*User, error) {
	query := `
	SELECT id, openid, unionid, username, nickname, avatar, status, level, score, roles, created_at, updated_at
	FROM users
	WHERE openid = ?
	`
	row := DB.QueryRow(query, openid)

	var user User
	var createdAt, updatedAt string
	err := row.Scan(&user.ID, &user.OpenID, &user.UnionID, &user.Username, &user.Nickname, &user.Avatar, &user.Status, &user.Level, &user.Score, &user.Roles, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	user.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &user, nil
}

// UpdateUser 更新用户信息
func UpdateUser(user *User) error {
	query := `
	UPDATE users
	SET openid = ?, unionid = ?, username = ?, password = ?, nickname = ?, avatar = ?, status = ?, level = ?, score = ?, roles = ?, updated_at = CURRENT_TIMESTAMP
	WHERE id = ?
	`
	_, err := DB.Exec(query, user.OpenID, user.UnionID, user.Username, user.Password, user.Nickname, user.Avatar, user.Status, user.Level, user.Score, user.Roles, user.ID)
	return err
}

// DeleteUser 删除用户
func DeleteUser(id int) error {
	query := "DELETE FROM users WHERE id = ?"
	_, err := DB.Exec(query, id)
	return err
}

// ListUsers 获取用户列表
func ListUsers(page, pageSize int) ([]*User, int, error) {
	// 获取总数
	countQuery := "SELECT COUNT(*) FROM users"
	var total int
	if err := DB.QueryRow(countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	offset := (page - 1) * pageSize
	query := `
	SELECT id, openid, unionid, username, nickname, avatar, status, level, score, roles, created_at, updated_at
	FROM users
	ORDER BY id DESC
	LIMIT ? OFFSET ?
	`
	rows, err := DB.Query(query, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		var user User
		var createdAt, updatedAt string
		err := rows.Scan(&user.ID, &user.OpenID, &user.UnionID, &user.Username, &user.Nickname, &user.Avatar, &user.Status, &user.Level, &user.Score, &user.Roles, &createdAt, &updatedAt)
		if err != nil {
			return nil, 0, err
		}
		user.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		user.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		users = append(users, &user)
	}

	return users, total, nil
}
