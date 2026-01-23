package model

import (
	"database/sql"
	"errors"
	"time"
)

// MediaAsset 媒体资源模型
type MediaAsset struct {
	ID        int       `json:"id"`
	Type      string    `json:"type"`
	URL       string    `json:"url"`
	OwnerID   int       `json:"owner_id"`
	Hash      string    `json:"hash"`
	Size      int       `json:"size"`
	CreatedAt time.Time `json:"created_at"`
}

// CreateMediaAsset 创建新媒体资源
func CreateMediaAsset(media *MediaAsset) error {
	query := `
	INSERT INTO media_assets (type, url, owner_id, hash, size)
	VALUES (?, ?, ?, ?, ?)
	`
	_, err := DB.Exec(query, media.Type, media.URL, media.OwnerID, media.Hash, media.Size)
	return err
}

// GetMediaAssetByID 根据ID获取媒体资源
func GetMediaAssetByID(id int) (*MediaAsset, error) {
	query := `
	SELECT id, type, url, owner_id, hash, size, created_at
	FROM media_assets
	WHERE id = ?
	`
	row := DB.QueryRow(query, id)

	var media MediaAsset
	var createdAt string
	err := row.Scan(&media.ID, &media.Type, &media.URL, &media.OwnerID, &media.Hash, &media.Size, &createdAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("media asset not found")
		}
		return nil, err
	}

	media.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	return &media, nil
}

// GetMediaAssetByHash 根据哈希值获取媒体资源
func GetMediaAssetByHash(hash string) (*MediaAsset, error) {
	query := `
	SELECT id, type, url, owner_id, hash, size, created_at
	FROM media_assets
	WHERE hash = ?
	`
	row := DB.QueryRow(query, hash)

	var media MediaAsset
	var createdAt string
	err := row.Scan(&media.ID, &media.Type, &media.URL, &media.OwnerID, &media.Hash, &media.Size, &createdAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("media asset not found")
		}
		return nil, err
	}

	media.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	return &media, nil
}

// ListMediaAssets 获取媒体资源列表
func ListMediaAssets(page, pageSize int, ownerID int) ([]*MediaAsset, int, error) {
	// 构建查询条件
	whereClause := ""
	args := []interface{}{}

	if ownerID > 0 {
		whereClause = " WHERE owner_id = ?"
		args = append(args, ownerID)
	}

	// 获取总数
	countQuery := "SELECT COUNT(*) FROM media_assets" + whereClause
	var total int
	if err := DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	offset := (page - 1) * pageSize
	query := `
	SELECT id, type, url, owner_id, hash, size, created_at
	FROM media_assets
	` + whereClause + `
	ORDER BY created_at DESC
	LIMIT ? OFFSET ?
	`
	args = append(args, pageSize, offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var mediaList []*MediaAsset
	for rows.Next() {
		var media MediaAsset
		var createdAt string
		err := rows.Scan(&media.ID, &media.Type, &media.URL, &media.OwnerID, &media.Hash, &media.Size, &createdAt)
		if err != nil {
			return nil, 0, err
		}
		media.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		mediaList = append(mediaList, &media)
	}

	return mediaList, total, nil
}
