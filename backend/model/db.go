package model

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

// InitDB 初始化数据库连接
func InitDB() error {
	var err error
	DB, err = sql.Open("sqlite3", "./kaoshiba.db")
	if err != nil {
		return err
	}

	// 测试连接
	if err = DB.Ping(); err != nil {
		return err
	}

	// 创建表结构
	if err = createTables(); err != nil {
		return err
	}

	log.Println("Database initialized successfully")
	return nil
}

// createTables 创建数据库表结构
func createTables() error {
	// 用户表
	userTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		openid TEXT UNIQUE,
		unionid TEXT,
		username TEXT UNIQUE,
		password TEXT,
		nickname TEXT,
		avatar TEXT,
		status INTEGER DEFAULT 1,
		level INTEGER DEFAULT 1,
		score INTEGER DEFAULT 0,
		roles TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	`
	if _, err := DB.Exec(userTable); err != nil {
		return err
	}

	// 题目表
	questionTable := `
	CREATE TABLE IF NOT EXISTS questions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		type TEXT NOT NULL,
		content TEXT NOT NULL,
		options TEXT,
		answer TEXT NOT NULL,
		analysis TEXT,
		difficulty INTEGER DEFAULT 1,
		tags TEXT,
		version INTEGER DEFAULT 1,
		media TEXT,
		code_blocks TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	`
	if _, err := DB.Exec(questionTable); err != nil {
		return err
	}

	// 试卷表
	paperTable := `
	CREATE TABLE IF NOT EXISTS papers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		description TEXT,
		question_refs TEXT NOT NULL,
		total_score INTEGER NOT NULL,
		duration INTEGER NOT NULL,
		visible TEXT DEFAULT 'all',
		shuffle INTEGER DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	`
	if _, err := DB.Exec(paperTable); err != nil {
		return err
	}

	// 考试表
	examTable := `
	CREATE TABLE IF NOT EXISTS exams (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		paper_id INTEGER NOT NULL,
		start_time TIMESTAMP NOT NULL,
		end_time TIMESTAMP NOT NULL,
		status TEXT DEFAULT 'pending',
		exam_limit TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (paper_id) REFERENCES papers(id)
	);
	`
	if _, err := DB.Exec(examTable); err != nil {
		return err
	}

	// 答题记录表
	answerSheetTable := `
	CREATE TABLE IF NOT EXISTS answer_sheets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		exam_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		answers TEXT NOT NULL,
		auto_score REAL DEFAULT 0,
		manual_score REAL DEFAULT 0,
		final_score REAL DEFAULT 0,
		submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		cheat_flags TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (exam_id) REFERENCES exams(id),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	`
	if _, err := DB.Exec(answerSheetTable); err != nil {
		return err
	}

	// 媒体资源表
	mediaTable := `
	CREATE TABLE IF NOT EXISTS media_assets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		type TEXT NOT NULL,
		url TEXT NOT NULL,
		owner_id INTEGER,
		hash TEXT NOT NULL,
		size INTEGER NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (owner_id) REFERENCES users(id)
	);
	`
	if _, err := DB.Exec(mediaTable); err != nil {
		return err
	}

	// 审计日志表
	auditLogTable := `
	CREATE TABLE IF NOT EXISTS audit_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		actor_id INTEGER,
		action TEXT NOT NULL,
		resource_type TEXT,
		resource_id INTEGER,
		payload TEXT,
		ip TEXT,
		ua TEXT,
		trace_id TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (actor_id) REFERENCES users(id)
	);
	`
	if _, err := DB.Exec(auditLogTable); err != nil {
		return err
	}

	return nil
}
