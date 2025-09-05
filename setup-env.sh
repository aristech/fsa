#!/bin/bash

# Field Service Automation - Environment Setup Script

echo "🚀 Setting up Field Service Automation environment..."

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Field Service Automation Environment Configuration

# Server Configuration
NEXT_PUBLIC_SERVER_URL=http://localhost:8082
NEXT_PUBLIC_ASSETS_DIR=/assets
BUILD_STATIC_EXPORT=false

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/field-service-automation

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-make-it-long-and-random-$(date +%s)
JWT_EXPIRES_IN=7d

# Authentication Configuration
AUTH_METHOD=jwt
EOF
    echo "✅ .env.local file created successfully!"
else
    echo "⚠️  .env.local file already exists. Skipping creation."
fi

echo ""
echo "🔧 Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure MongoDB is running locally on port 27017"
echo "2. Run 'yarn install' to install dependencies"
echo "3. Run 'yarn dev' to start the development server"
echo "4. Visit http://localhost:8082/auth/jwt/sign-in"
echo "5. Use these credentials:"
echo "   - Tenant Slug: acme-field-services"
echo "   - Email: admin@acme.com"
echo "   - Password: password123"
echo ""
echo "🎉 Happy coding!"
