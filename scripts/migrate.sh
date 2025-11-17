#!/bin/bash
# Database Migration Script
# Runs all pending migrations against Supabase database

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  Anchor Database Migration Tool${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL or SUPABASE_DB_URL must be set${NC}"
    echo "Example: export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
    exit 1
fi

# Use SUPABASE_DB_URL if set, otherwise DATABASE_URL
DB_URL="${SUPABASE_DB_URL:-$DATABASE_URL}"

echo -e "${YELLOW}📍 Database: ${DB_URL%%@*}@***${NC}"
echo ""

# Migration directory
MIGRATION_DIR="$(dirname "$0")/../supabase/migrations"

if [ ! -d "$MIGRATION_DIR" ]; then
    echo -e "${RED}❌ Migration directory not found: $MIGRATION_DIR${NC}"
    exit 1
fi

# Create migrations tracking table if it doesn't exist
echo -e "${YELLOW}📋 Creating migrations table...${NC}"
psql "$DB_URL" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
" || {
    echo -e "${RED}❌ Failed to create migrations table${NC}"
    exit 1
}

echo -e "${GREEN}✅ Migrations table ready${NC}"
echo ""

# Get list of applied migrations
APPLIED_MIGRATIONS=$(psql "$DB_URL" -t -c "SELECT version FROM schema_migrations ORDER BY version;")

# Run migrations in order
echo -e "${YELLOW}🔄 Running migrations...${NC}"
echo ""

MIGRATION_COUNT=0

for migration_file in "$MIGRATION_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
        # Extract version from filename (e.g., 20240101000000 from 20240101000000_initial_schema.sql)
        filename=$(basename "$migration_file")
        version="${filename%%_*}"

        # Check if already applied
        if echo "$APPLIED_MIGRATIONS" | grep -q "$version"; then
            echo -e "⏭️  Skipping $filename (already applied)"
            continue
        fi

        echo -e "${YELLOW}⚙️  Applying $filename...${NC}"

        # Run migration
        if psql "$DB_URL" -f "$migration_file"; then
            # Mark as applied
            psql "$DB_URL" -c "INSERT INTO schema_migrations (version) VALUES ('$version');" > /dev/null
            echo -e "${GREEN}✅ Applied $filename${NC}"
            ((MIGRATION_COUNT++))
        else
            echo -e "${RED}❌ Failed to apply $filename${NC}"
            exit 1
        fi

        echo ""
    fi
done

if [ $MIGRATION_COUNT -eq 0 ]; then
    echo -e "${GREEN}✨ Database is up to date! No migrations needed.${NC}"
else
    echo -e "${GREEN}✨ Successfully applied $MIGRATION_COUNT migration(s)!${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Migration complete!${NC}"
