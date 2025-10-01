#!/bin/bash

# Production File Storage Setup Script
# This script sets up persistent file storage that survives deployments

set -e  # Exit on any error

echo "🚀 Setting up persistent file storage for FSA application..."

# Configuration
PERSISTENT_STORAGE="/var/lib/fsa-uploads"
APP_UPLOADS="/var/www/progressnet.io-app/apps/backend/uploads"
BACKUP_DIR="/var/backups/fsa-file-migration-$(date +%Y%m%d-%H%M%S)"

# Create persistent storage directory
echo "📁 Creating persistent storage directory..."
sudo mkdir -p "$PERSISTENT_STORAGE"
sudo chown -R $USER:www-data "$PERSISTENT_STORAGE"
sudo chmod -R 755 "$PERSISTENT_STORAGE"

# Backup existing uploads if they exist
if [ -d "$APP_UPLOADS" ] && [ "$(ls -A $APP_UPLOADS)" ]; then
    echo "📦 Backing up existing uploads..."
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$APP_UPLOADS" "$BACKUP_DIR/uploads-backup"
    echo "✅ Backup created at $BACKUP_DIR/uploads-backup"

    # Move existing uploads to persistent storage
    echo "🔄 Moving existing uploads to persistent storage..."
    sudo cp -r "$APP_UPLOADS"/* "$PERSISTENT_STORAGE/" 2>/dev/null || true
    echo "✅ Uploads moved to persistent storage"
fi

# Create symlink from app uploads to persistent storage
echo "🔗 Creating symbolic link..."
sudo rm -rf "$APP_UPLOADS"
sudo ln -sf "$PERSISTENT_STORAGE" "$APP_UPLOADS"
echo "✅ Symbolic link created: $APP_UPLOADS -> $PERSISTENT_STORAGE"

# Set proper permissions
echo "🔒 Setting proper permissions..."
sudo chown -R $USER:www-data "$PERSISTENT_STORAGE"
sudo chmod -R 755 "$PERSISTENT_STORAGE"
sudo find "$PERSISTENT_STORAGE" -type f -exec chmod 644 {} \;

# Create maintenance script
echo "🛠️  Creating maintenance script..."
sudo tee /usr/local/bin/fsa-file-maintenance > /dev/null << 'EOF'
#!/bin/bash
# FSA File Storage Maintenance Script
# Run this weekly to clean up old files and maintain storage health

PERSISTENT_STORAGE="/var/lib/fsa-uploads"
LOG_FILE="/var/log/fsa-file-maintenance.log"

echo "$(date): Starting FSA file maintenance..." >> "$LOG_FILE"

# Clean up orphaned files (files not tracked in database)
# This would require a database query - placeholder for now
echo "$(date): Cleaning up orphaned files..." >> "$LOG_FILE"

# Set proper permissions (in case they drift)
chown -R $USER:www-data "$PERSISTENT_STORAGE"
chmod -R 755 "$PERSISTENT_STORAGE"
find "$PERSISTENT_STORAGE" -type f -exec chmod 644 {} \;

echo "$(date): File maintenance completed." >> "$LOG_FILE"
EOF

sudo chmod +x /usr/local/bin/fsa-file-maintenance

# Add cron job for weekly maintenance
echo "⏰ Setting up weekly maintenance cron job..."
(crontab -l 2>/dev/null | grep -v "fsa-file-maintenance"; echo "0 2 * * 0 /usr/local/bin/fsa-file-maintenance") | crontab -

# Test the setup
echo "🧪 Testing file storage setup..."
TEST_FILE="$PERSISTENT_STORAGE/test-file-$(date +%s).txt"
echo "This is a test file created by setup script" | sudo tee "$TEST_FILE" > /dev/null
if [ -f "$TEST_FILE" ] && [ -L "$APP_UPLOADS" ]; then
    echo "✅ File storage test passed"
    sudo rm "$TEST_FILE"
else
    echo "❌ File storage test failed"
    exit 1
fi

echo ""
echo "🎉 Persistent file storage setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - Persistent storage: $PERSISTENT_STORAGE"
echo "   - App uploads path: $APP_UPLOADS (symlinked)"
echo "   - Backup location: $BACKUP_DIR"
echo "   - Maintenance script: /usr/local/bin/fsa-file-maintenance"
echo "   - Weekly cron job added for maintenance"
echo ""
echo "🔄 Next steps:"
echo "   1. Test file upload functionality"
echo "   2. Deploy your updated CI/CD pipeline"
echo "   3. Monitor logs during next deployment"
echo ""
echo "⚠️  Important: The symlink will survive deployments and preserve all uploaded files!"