#!/bin/bash
##############################################################################
# Setup Persistent Uploads Storage
#
# This script sets up persistent storage for file uploads that survives
# deployments. It should be run ONCE on the production server, or when
# you need to verify/fix the uploads storage setup.
#
# Usage: sudo bash scripts/setup-persistent-uploads.sh
##############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Persistent Uploads Storage Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
PERSISTENT_STORAGE="/var/lib/fsa-uploads"
APP_DIR="/var/www/progressnet.io-app"
BACKUP_DIR="/var/backups/fsa-uploads-$(date +%Y%m%d-%H%M%S)"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run with sudo${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 1: Creating persistent storage directory${NC}"
mkdir -p "$PERSISTENT_STORAGE"
echo -e "${GREEN}✅ Created $PERSISTENT_STORAGE${NC}"
echo ""

echo -e "${YELLOW}Step 2: Checking existing uploads${NC}"

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
  echo -e "${YELLOW}⚠️  App directory not found at $APP_DIR${NC}"
  echo -e "${YELLOW}   This script should be run on the production server${NC}"
  echo -e "${YELLOW}   Continuing to set up persistent storage...${NC}"
fi

# Check current uploads setup
UPLOADS_DIR="$APP_DIR/apps/backend/uploads"

if [ -L "$UPLOADS_DIR" ]; then
  LINK_TARGET=$(readlink -f "$UPLOADS_DIR")
  echo -e "${GREEN}✅ Uploads is already a symlink${NC}"
  echo -e "   Points to: $LINK_TARGET"

  if [ "$LINK_TARGET" = "$PERSISTENT_STORAGE" ]; then
    echo -e "${GREEN}✅ Symlink points to correct persistent storage${NC}"
  else
    echo -e "${YELLOW}⚠️  Symlink points to wrong location!${NC}"
    echo -e "${YELLOW}   Expected: $PERSISTENT_STORAGE${NC}"
    echo -e "${YELLOW}   Actual:   $LINK_TARGET${NC}"

    # Migrate data from wrong location to persistent storage
    if [ -d "$LINK_TARGET" ]; then
      echo -e "${BLUE}🔄 Migrating data to persistent storage...${NC}"
      cp -rn "$LINK_TARGET"/* "$PERSISTENT_STORAGE/" 2>/dev/null || true
      echo -e "${GREEN}✅ Data migrated${NC}"
    fi
  fi

elif [ -d "$UPLOADS_DIR" ]; then
  echo -e "${YELLOW}📁 Uploads is a regular directory (NOT a symlink)${NC}"

  # Count files
  FILE_COUNT=$(find "$UPLOADS_DIR" -type f 2>/dev/null | wc -l)
  TOTAL_SIZE=$(du -sh "$UPLOADS_DIR" 2>/dev/null | cut -f1)

  echo -e "   Files: $FILE_COUNT"
  echo -e "   Size:  $TOTAL_SIZE"

  if [ "$FILE_COUNT" -gt 0 ]; then
    echo -e "${BLUE}🔄 Migrating uploads to persistent storage...${NC}"

    # Create backup first
    echo -e "${BLUE}📦 Creating backup at $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_DIR"
    cp -r "$UPLOADS_DIR" "$BACKUP_DIR/"
    echo -e "${GREEN}✅ Backup created${NC}"

    # Copy to persistent storage (don't overwrite existing files)
    cp -rn "$UPLOADS_DIR"/* "$PERSISTENT_STORAGE/" 2>/dev/null || true
    echo -e "${GREEN}✅ Files migrated to persistent storage${NC}"

    # Remove old directory
    echo -e "${BLUE}🗑️  Removing old uploads directory${NC}"
    rm -rf "$UPLOADS_DIR"
    echo -e "${GREEN}✅ Old directory removed${NC}"
  else
    echo -e "${YELLOW}⚠️  No files found, removing empty directory${NC}"
    rm -rf "$UPLOADS_DIR"
  fi

elif [ -e "$UPLOADS_DIR" ]; then
  echo -e "${RED}❌ Uploads path exists but is neither a directory nor a symlink${NC}"
  echo -e "${RED}   Manual intervention required${NC}"
  exit 1
else
  echo -e "${YELLOW}📁 No uploads directory found - will create symlink${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Setting up symlink${NC}"

# Ensure parent directory exists
mkdir -p "$APP_DIR/apps/backend"

# Remove uploads path if it exists (and is not already the correct symlink)
if [ -e "$UPLOADS_DIR" ] && [ "$(readlink -f "$UPLOADS_DIR")" != "$PERSISTENT_STORAGE" ]; then
  rm -rf "$UPLOADS_DIR"
fi

# Create symlink
ln -sf "$PERSISTENT_STORAGE" "$UPLOADS_DIR"
echo -e "${GREEN}✅ Symlink created: $UPLOADS_DIR -> $PERSISTENT_STORAGE${NC}"

echo ""
echo -e "${YELLOW}Step 4: Setting permissions${NC}"

# Get the user who should own the files (runner user or current non-root user)
if [ -n "$SUDO_USER" ]; then
  OWNER_USER="$SUDO_USER"
else
  OWNER_USER=$(stat -c '%U' "$APP_DIR" 2>/dev/null || echo "runner")
fi

chown -R "$OWNER_USER":www-data "$PERSISTENT_STORAGE"
chmod -R 775 "$PERSISTENT_STORAGE"
echo -e "${GREEN}✅ Permissions set: $OWNER_USER:www-data, mode 775${NC}"

echo ""
echo -e "${YELLOW}Step 5: Verification${NC}"

# Verify symlink
if [ -L "$UPLOADS_DIR" ]; then
  LINK_TARGET=$(readlink -f "$UPLOADS_DIR")
  if [ "$LINK_TARGET" = "$PERSISTENT_STORAGE" ]; then
    echo -e "${GREEN}✅ Symlink is correct${NC}"
  else
    echo -e "${RED}❌ Symlink verification failed${NC}"
    echo -e "   Expected: $PERSISTENT_STORAGE"
    echo -e "   Actual:   $LINK_TARGET"
    exit 1
  fi
else
  echo -e "${RED}❌ Uploads is not a symlink${NC}"
  exit 1
fi

# Count files in persistent storage
PERSISTENT_FILE_COUNT=$(find "$PERSISTENT_STORAGE" -type f 2>/dev/null | wc -l)
PERSISTENT_SIZE=$(du -sh "$PERSISTENT_STORAGE" 2>/dev/null | cut -f1)

echo -e "${GREEN}✅ Persistent storage verified${NC}"
echo -e "   Location: $PERSISTENT_STORAGE"
echo -e "   Files:    $PERSISTENT_FILE_COUNT"
echo -e "   Size:     $PERSISTENT_SIZE"

# List directory structure (first 3 levels)
echo ""
echo -e "${BLUE}📊 Directory structure (sample):${NC}"
ls -lah "$UPLOADS_DIR" | head -n 10

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}What this means:${NC}"
echo -e "  • Uploads are now stored in: $PERSISTENT_STORAGE"
echo -e "  • They will survive deployments"
echo -e "  • The app accesses them via: $UPLOADS_DIR (symlink)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Test file upload in the application"
echo -e "  2. Verify files appear in $PERSISTENT_STORAGE"
echo -e "  3. Run a deployment and verify uploads still exist"
echo ""

if [ -d "$BACKUP_DIR" ]; then
  echo -e "${BLUE}Backup created at: $BACKUP_DIR${NC}"
  echo -e "${YELLOW}You can safely delete this backup after verifying everything works${NC}"
  echo ""
fi
