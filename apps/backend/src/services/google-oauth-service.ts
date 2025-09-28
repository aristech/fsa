import { OAuth2Client } from 'google-auth-library';

export class GoogleOAuthService {
  private static client: OAuth2Client;

  /**
   * Initialize Google OAuth client
   */
  static initialize() {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is required');
    }

    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Get Google OAuth client instance
   */
  static getInstance(): OAuth2Client {
    if (!this.client) {
      this.initialize();
    }
    return this.client;
  }

  /**
   * Generate authorization URL for Google OAuth
   */
  static generateAuthUrl(state?: string): string {
    const client = this.getInstance();

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state: state || '', // Use for CSRF protection and tenant context
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return authUrl;
  }

  /**
   * Verify and exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
  }> {
    const client = this.getInstance();

    const { tokens } = await client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('Failed to obtain access token from Google');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      idToken: tokens.id_token || undefined,
    };
  }

  /**
   * Get user profile information from Google
   */
  static async getUserProfile(accessToken: string): Promise<{
    id: string;
    email: string;
    name: string;
    givenName: string;
    familyName: string;
    picture?: string;
    emailVerified: boolean;
  }> {
    const client = this.getInstance();
    client.setCredentials({ access_token: accessToken });

    // Verify the token and get user info
    const ticket = await client.verifyIdToken({
      idToken: accessToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Failed to verify Google ID token');
    }

    return {
      id: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      givenName: payload.given_name || '',
      familyName: payload.family_name || '',
      picture: payload.picture,
      emailVerified: payload.email_verified || false,
    };
  }

  /**
   * Verify Google ID token directly (alternative method)
   */
  static async verifyIdToken(idToken: string): Promise<{
    id: string;
    email: string;
    name: string;
    givenName: string;
    familyName: string;
    picture?: string;
    emailVerified: boolean;
  }> {
    const client = this.getInstance();

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Failed to verify Google ID token');
    }

    if (!payload.email_verified) {
      throw new Error('Google email is not verified');
    }

    return {
      id: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      givenName: payload.given_name || '',
      familyName: payload.family_name || '',
      picture: payload.picture,
      emailVerified: payload.email_verified || false,
    };
  }

  /**
   * Create state parameter for OAuth flow with tenant context
   */
  static createStateParameter(params: {
    planId?: string;
    billingCycle?: string;
    redirectPath?: string;
    companyName?: string;
  }): string {
    const stateData = {
      timestamp: Date.now(),
      ...params,
    };

    // In production, you might want to encrypt this or store it in Redis/database
    return Buffer.from(JSON.stringify(stateData)).toString('base64');
  }

  /**
   * Parse state parameter from OAuth callback
   */
  static parseStateParameter(state: string): {
    planId?: string;
    billingCycle?: string;
    redirectPath?: string;
    companyName?: string;
    timestamp: number;
  } {
    try {
      const decoded = Buffer.from(state, 'base64').toString('utf-8');
      const stateData = JSON.parse(decoded);

      // Check if state is not too old (5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (stateData.timestamp < fiveMinutesAgo) {
        throw new Error('OAuth state has expired');
      }

      return stateData;
    } catch (error) {
      throw new Error('Invalid OAuth state parameter');
    }
  }
}