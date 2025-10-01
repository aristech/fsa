#!/bin/bash

# File Storage Verification Script
# Run this to verify that persistent file storage is working correctly

echo "🔍 Verifying FSA file storage setup..."
echo "=================================="

# Check if we're running on the server
if [ ! -d "/var/www/progressnet.io-app" ]; then
    echo "⚠️  This script should be run on the production server"
    echo "   Current location appears to be development environment"
    exit 1
fi

PERSISTENT_STORAGE="/var/lib/fsa-uploads"
APP_UPLOADS="/var/www/progressnet.io-app/apps/backend/uploads"

echo ""
echo "📋 Configuration Check:"
echo "   Persistent Storage: $PERSISTENT_STORAGE"
echo "   App Uploads Path: $APP_UPLOADS"
echo ""

# Check persistent storage directory
echo "📁 Checking persistent storage directory..."
if [ -d "$PERSISTENT_STORAGE" ]; then
    echo "   ✅ Persistent storage exists: $PERSISTENT_STORAGE"

    # Check permissions
    PERMS=$(stat -c "%a" "$PERSISTENT_STORAGE" 2>/dev/null || stat -f "%A" "$PERSISTENT_STORAGE" 2>/dev/null)
    OWNER=$(stat -c "%U:%G" "$PERSISTENT_STORAGE" 2>/dev/null || stat -f "%Su:%Sg" "$PERSISTENT_STORAGE" 2>/dev/null)
    echo "   📊 Permissions: $PERMS, Owner: $OWNER"

    # Check contents
    FILE_COUNT=$(find "$PERSISTENT_STORAGE" -type f 2>/dev/null | wc -l)
    DIR_COUNT=$(find "$PERSISTENT_STORAGE" -type d 2>/dev/null | wc -l)
    echo "   📄 Contents: $FILE_COUNT files, $DIR_COUNT directories"
else
    echo "   ❌ Persistent storage NOT found: $PERSISTENT_STORAGE"
fi

# Check symlink
echo ""
echo "🔗 Checking symbolic link..."
if [ -L "$APP_UPLOADS" ]; then
    LINK_TARGET=$(readlink "$APP_UPLOADS")
    echo "   ✅ Symbolic link exists: $APP_UPLOADS"
    echo "   🎯 Points to: $LINK_TARGET"

    if [ "$LINK_TARGET" = "$PERSISTENT_STORAGE" ]; then
        echo "   ✅ Link target is correct"
    else
        echo "   ⚠️  Link target mismatch. Expected: $PERSISTENT_STORAGE"
    fi
else
    echo "   ❌ Symbolic link NOT found: $APP_UPLOADS"

    if [ -d "$APP_UPLOADS" ]; then
        echo "   ⚠️  Directory exists instead of symlink - files may not persist"
    fi
fi

# Test file operations
echo ""
echo "🧪 Testing file operations..."
TEST_FILE="$PERSISTENT_STORAGE/test-verification-$(date +%s).txt"
TEST_CONTENT="Verification test at $(date)"

# Test write
if echo "$TEST_CONTENT" > "$TEST_FILE" 2>/dev/null; then
    echo "   ✅ Write test passed"

    # Test read
    if [ -f "$TEST_FILE" ] && grep -q "Verification test" "$TEST_FILE"; then
        echo "   ✅ Read test passed"

        # Test via symlink
        if [ -f "$APP_UPLOADS/$(basename $TEST_FILE)" ]; then
            echo "   ✅ Symlink access test passed"
        else
            echo "   ❌ Symlink access test failed"
        fi

        # Cleanup
        rm "$TEST_FILE" 2>/dev/null
        echo "   🧹 Test file cleaned up"
    else
        echo "   ❌ Read test failed"
    fi
else
    echo "   ❌ Write test failed"
fi

# Check maintenance script
echo ""
echo "🛠️  Checking maintenance setup..."
if [ -f "/usr/local/bin/fsa-file-maintenance" ]; then
    echo "   ✅ Maintenance script exists"

    # Check if it's executable
    if [ -x "/usr/local/bin/fsa-file-maintenance" ]; then
        echo "   ✅ Maintenance script is executable"
    else
        echo "   ⚠️  Maintenance script is not executable"
    fi
else
    echo "   ⚠️  Maintenance script not found"
fi

# Check cron job
echo ""
echo "⏰ Checking cron job..."
if crontab -l 2>/dev/null | grep -q "fsa-file-maintenance"; then
    echo "   ✅ Maintenance cron job is configured"
else
    echo "   ⚠️  Maintenance cron job not found"
fi

# Check backups
echo ""
echo "📦 Checking backups..."
BACKUP_COUNT=$(sudo find /var/backups -name "fsa-*" -type d 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo "   ✅ Found $BACKUP_COUNT deployment backups"
    LATEST_BACKUP=$(sudo find /var/backups -name "fsa-*" -type d | sort -r | head -1)
    echo "   📅 Latest backup: $LATEST_BACKUP"
else
    echo "   ℹ️  No deployment backups found (normal for first setup)"
fi

# Summary
echo ""
echo "📊 SUMMARY:"
echo "=========="

ISSUES=0

if [ ! -d "$PERSISTENT_STORAGE" ]; then
    echo "❌ Persistent storage missing"
    ((ISSUES++))
fi

if [ ! -L "$APP_UPLOADS" ]; then
    echo "❌ Symbolic link missing"
    ((ISSUES++))
fi

if [ ! -f "/usr/local/bin/fsa-file-maintenance" ]; then
    echo "⚠️  Maintenance script missing"
fi

if ! crontab -l 2>/dev/null | grep -q "fsa-file-maintenance"; then
    echo "⚠️  Cron job missing"
fi

if [ "$ISSUES" -eq 0 ]; then
    echo "🎉 File storage setup is working correctly!"
    echo "   Your uploaded files will persist across deployments."
else
    echo "⚠️  Found $ISSUES critical issues that need attention."
    echo "   Please run the setup script: sudo ./scripts/setup-persistent-storage.sh"
fi

echo ""
echo "📝 Next steps:"
echo "   1. Test file upload through your application"
echo "   2. Deploy your application and verify files persist"
echo "   3. Monitor /var/log/fsa-file-maintenance.log for maintenance activities"