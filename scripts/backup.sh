#!/bin/bash
# Automated Database Backup Script
# Creates encrypted backups of Supabase/PostgreSQL database

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔒 Anchor Database Backup Tool${NC}"
echo ""

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_NAME="${POSTGRES_DB:-anchor}"
DB_USER="${POSTGRES_USER:-anchor}"
DB_PASSWORD="${POSTGRES_PASSWORD}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="anchor_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
ENCRYPTED_PATH="${BACKUP_PATH}.gpg"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📦 Creating backup...${NC}"
echo "Database: $DB_NAME@$DB_HOST"
echo "Output: $BACKUP_FILE"
echo ""

# Create backup using pg_dump
export PGPASSWORD="$DB_PASSWORD"
pg_dump -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F p \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        -f "$BACKUP_PATH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup created successfully${NC}"

    # Get file size
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    echo "Size: $BACKUP_SIZE"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

# Encrypt backup if encryption key is provided
if [ -n "$ENCRYPTION_KEY" ]; then
    echo ""
    echo -e "${YELLOW}🔐 Encrypting backup...${NC}"

    echo "$ENCRYPTION_KEY" | gpg --batch \
                                  --yes \
                                  --passphrase-fd 0 \
                                  --symmetric \
                                  --cipher-algo AES256 \
                                  -o "$ENCRYPTED_PATH" \
                                  "$BACKUP_PATH"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup encrypted${NC}"

        # Remove unencrypted backup
        rm "$BACKUP_PATH"
        BACKUP_PATH="$ENCRYPTED_PATH"

        ENCRYPTED_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        echo "Encrypted size: $ENCRYPTED_SIZE"
    else
        echo -e "${RED}❌ Encryption failed${NC}"
        exit 1
    fi
fi

# Upload to cloud storage (optional)
if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
    echo ""
    echo -e "${YELLOW}☁️  Uploading to S3...${NC}"

    aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/backups/$(basename "$BACKUP_PATH")"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Uploaded to S3${NC}"
    else
        echo -e "${RED}⚠️  S3 upload failed (backup still saved locally)${NC}"
    fi
fi

# Clean up old backups
echo ""
echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"

find "$BACKUP_DIR" -name "anchor_backup_*.sql*" -type f -mtime +$RETENTION_DAYS -delete

REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "anchor_backup_*.sql*" -type f | wc -l)
echo -e "${GREEN}✅ Cleanup complete. $REMAINING_BACKUPS backup(s) remaining.${NC}"

# Create backup manifest
echo ""
echo -e "${YELLOW}📝 Creating backup manifest...${NC}"

MANIFEST_FILE="${BACKUP_DIR}/manifest.json"

cat > "$MANIFEST_FILE" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "filename": "$(basename "$BACKUP_PATH")",
  "database": "$DB_NAME",
  "size": "$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH")",
  "encrypted": $([ -n "$ENCRYPTION_KEY" ] && echo "true" || echo "false"),
  "checksum": "$(sha256sum "$BACKUP_PATH" | cut -d' ' -f1)"
}
EOF

echo -e "${GREEN}✅ Manifest created${NC}"

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Backup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "File: $(basename "$BACKUP_PATH")"
echo "Location: $BACKUP_DIR"
echo "Retention: $RETENTION_DAYS days"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
