#!/bin/bash
# Database Restore Script
# Restores database from backup file

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔄 Anchor Database Restore Tool${NC}"
echo ""

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_NAME="${POSTGRES_DB:-anchor}"
DB_USER="${POSTGRES_USER:-anchor}"
DB_PASSWORD="${POSTGRES_PASSWORD}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Available backups:${NC}"
    ls -lh "$BACKUP_DIR"/anchor_backup_*.sql* 2>/dev/null || echo "No backups found"
    echo ""
    echo "Usage: $0 <backup-file>"
    echo "Example: $0 anchor_backup_20240115_120000.sql.gpg"
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Check if file exists
if [ ! -f "$BACKUP_PATH" ]; then
    echo -e "${RED}❌ Backup file not found: $BACKUP_PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}📂 Backup file: $BACKUP_FILE${NC}"
echo "Size: $(du -h "$BACKUP_PATH" | cut -f1)"
echo ""

# Decrypt if encrypted
if [[ "$BACKUP_FILE" == *.gpg ]]; then
    echo -e "${YELLOW}🔓 Decrypting backup...${NC}"

    if [ -z "$ENCRYPTION_KEY" ]; then
        echo -e "${RED}❌ BACKUP_ENCRYPTION_KEY not set${NC}"
        exit 1
    fi

    DECRYPTED_FILE="${BACKUP_PATH%.gpg}"

    echo "$ENCRYPTION_KEY" | gpg --batch \
                                  --yes \
                                  --passphrase-fd 0 \
                                  --decrypt \
                                  -o "$DECRYPTED_FILE" \
                                  "$BACKUP_PATH"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup decrypted${NC}"
        BACKUP_PATH="$DECRYPTED_FILE"
    else
        echo -e "${RED}❌ Decryption failed${NC}"
        exit 1
    fi
fi

# Confirm restore
echo ""
echo -e "${RED}⚠️  WARNING: This will replace the current database!${NC}"
echo "Database: $DB_NAME@$DB_HOST"
read -p "Continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled."

    # Clean up decrypted file if created
    if [[ "$BACKUP_FILE" == *.gpg ]]; then
        rm -f "$DECRYPTED_FILE"
    fi

    exit 0
fi

# Restore database
echo -e "${YELLOW}🔄 Restoring database...${NC}"

export PGPASSWORD="$DB_PASSWORD"
psql -h "$DB_HOST" \
     -U "$DB_USER" \
     -d "$DB_NAME" \
     -f "$BACKUP_PATH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database restored successfully${NC}"
else
    echo -e "${RED}❌ Restore failed${NC}"
    exit 1
fi

# Clean up decrypted file if created
if [[ "$BACKUP_FILE" == *.gpg ]]; then
    rm -f "$DECRYPTED_FILE"
    echo -e "${GREEN}✅ Cleaned up temporary files${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Restore complete!${NC}"
