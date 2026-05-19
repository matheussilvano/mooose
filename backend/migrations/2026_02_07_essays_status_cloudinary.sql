-- Essays status + Cloudinary metadata (PostgreSQL).
-- SQLite: recreate the database or apply equivalent ALTER TABLE statements manually.

ALTER TABLE essays ADD COLUMN IF NOT EXISTS arquivo_public_id VARCHAR;
ALTER TABLE essays ADD COLUMN IF NOT EXISTS arquivo_resource_type VARCHAR;
ALTER TABLE essays ADD COLUMN IF NOT EXISTS arquivo_type VARCHAR;
ALTER TABLE essays ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'pending';
ALTER TABLE essays ADD COLUMN IF NOT EXISTS error_code VARCHAR;
ALTER TABLE essays ADD COLUMN IF NOT EXISTS error_message VARCHAR;

UPDATE essays
SET status = CASE
    WHEN status IS NOT NULL THEN status
    WHEN resultado_json LIKE '%"status":"erro_ocr"%' THEN 'ocr_failed'
    WHEN nota_final IS NOT NULL THEN 'done'
    ELSE 'pending'
END
WHERE status IS NULL OR status = '';

CREATE INDEX IF NOT EXISTS idx_essays_status ON essays (status);
