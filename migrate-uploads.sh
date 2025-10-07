#!/bin/bash
# Migration script to fix uploads persistence issue
# Run this on the server with: bash migrate-uploads.sh

set -e  # Exit on error

PERSISTENT_STORAGE="/var/lib/fsa-uploads"
APP_DIR="/var/www/progressnet.io-app"

echo "🔧 Starting uploads migration..."

# Ensure persistent storage exists
sudo mkdir -p "$PERSISTENT_STORAGE"
sudo chown -R progressnet:www-data "$PERSISTENT_STORAGE"
sudo chmod -R 775 "$PERSISTENT_STORAGE"

# Migrate from root uploads if it's a real directory
if [ -d "$APP_DIR/uploads" ] && [ ! -L "$APP_DIR/uploads" ]; then
  echo "📦 Migrating files from $APP_DIR/uploads to persistent storage..."
  sudo cp -rn "$APP_DIR/uploads/"* "$PERSISTENT_STORAGE/" 2>/dev/null || true

  # Backup then remove old directory
  sudo mv "$APP_DIR/uploads" "$APP_DIR/uploads.backup.$(date +%Y%m%d-%H%M%S)"
  echo "✅ Old uploads backed up and removed"
fi

# Create symlink at correct location
ln -sf "$PERSISTENT_STORAGE" "$APP_DIR/uploads"
echo "✅ Symlink created: $APP_DIR/uploads -> $PERSISTENT_STORAGE"

# Verify
FILE_COUNT=$(sudo find "$PERSISTENT_STORAGE" -type f 2>/dev/null | wc -l)
echo "📊 Persistent storage now contains $FILE_COUNT files"

if [ -L "$APP_DIR/uploads" ]; then
  echo "✅ Migration complete! Uploads will now persist across deployments."
  ls -lah "$APP_DIR/uploads"
else
  echo "❌ ERROR: Symlink creation failed!"
  exit 1
fi
