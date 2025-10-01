# Google Authentication Setup Guide

## Overview
This guide explains how to set up Google OAuth authentication for the FSA application.

## Prerequisites
- Google Cloud Console account
- Access to create OAuth 2.0 credentials

## Setup Steps

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the Google+ API (if not already enabled)

### 2. Configure OAuth Consent Screen
1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required information:
   - App name: "FSA - Field Service Application"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users (for development)

### 3. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Configure authorized origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
5. Configure authorized redirect URIs:
   - `http://localhost:3000/auth/jwt/google-callback` (development)
   - `https://yourdomain.com/auth/jwt/google-callback` (production)

### 4. Get Client ID
1. Copy the generated Client ID
2. It should look like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`

### 5. Configure Environment Variables

#### Frontend (.env.local):
```bash
# Google Authentication
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

#### Backend (.env):
```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/jwt/google-callback
```

### 6. Test the Integration
1. Start the backend server: `npm run dev` (in backend directory)
2. Start the frontend server: `npm run dev` (in frontend directory)
3. Navigate to `/auth/jwt/sign-up`
4. Click "Continue with Google"
5. Verify redirect to Google OAuth page
6. Complete the sign-up flow
7. Verify redirect back to dashboard

## Troubleshooting

### Common Issues

#### "Missing required parameter: client_id"
- **Cause**: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` environment variable not set
- **Solution**: Add the environment variable to `.env.local`

#### "Failed to initiate Google OAuth"
- **Cause**: Backend Google OAuth configuration missing
- **Solution**: Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` to backend `.env`

#### "Invalid redirect URI"
- **Cause**: Redirect URI not configured in Google Cloud Console
- **Solution**: Add the correct redirect URIs in OAuth credentials

#### "Access blocked: This app's request is invalid"
- **Cause**: OAuth consent screen not properly configured
- **Solution**: Complete the OAuth consent screen setup

#### "Error 400: redirect_uri_mismatch"
- **Cause**: Redirect URI in request doesn't match configured URIs
- **Solution**: Ensure redirect URIs match exactly in Google Cloud Console

### Development vs Production

#### Development Setup
- Use `http://localhost:3000` for authorized origins
- Use `http://localhost:3000/auth/jwt/sign-up` for redirect URIs
- Add test users in OAuth consent screen

#### Production Setup
- Use your production domain for authorized origins
- Use your production domain for redirect URIs
- Publish the OAuth consent screen
- Verify domain ownership

## Security Considerations

1. **Keep Client ID Secret**: While the client ID is public, keep it secure
2. **Use HTTPS in Production**: Always use HTTPS for production
3. **Validate Tokens**: Backend validates Google ID tokens
4. **Rate Limiting**: Implement rate limiting for OAuth endpoints
5. **Monitor Usage**: Monitor OAuth usage in Google Cloud Console

## Backend Configuration

The backend is already configured to handle Google OAuth:
- `POST /api/v1/auth/google` - Initiates OAuth flow
- `GET /api/v1/auth/google/callback` - Handles OAuth callback
- Automatic tenant and user creation
- Secure token verification

## Testing

### Manual Testing
1. Test sign-up flow with Google
2. Test sign-in flow with Google
3. Verify user creation in database
4. Verify tenant creation
5. Test error handling (invalid credentials, network errors)

### Automated Testing
- Unit tests for Google OAuth service
- Integration tests for OAuth flow
- Error handling tests

## Support

If you encounter issues:
1. Check Google Cloud Console for error logs
2. Verify environment variables are set correctly
3. Check browser console for JavaScript errors
4. Verify redirect URIs match exactly
5. Contact support with specific error messages
