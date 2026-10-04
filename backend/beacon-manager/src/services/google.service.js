import { google } from 'googleapis';
import { env } from '../config/env.js';

// Scopes: identity (email/profile) + permission to send mail as the user
const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.send',
];

export const googleService = {
  isConfigured() {
    return Boolean(env.googleClientId && env.googleClientSecret);
  },

  client() {
    return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);
  },

  // URL to send the user to Google's consent screen. `state` carries the return origin.
  getAuthUrl(state) {
    return this.client().generateAuthUrl({
      access_type: 'offline', // get a refresh token
      prompt: 'consent', // always return a refresh token
      scope: SCOPES,
      state,
      include_granted_scopes: true,
    });
  },

  // Exchange the auth code for tokens + basic profile info
  async exchangeCode(code) {
    const client = this.client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();
    return {
      googleId: data.id || '',
      email: data.email,
      name: data.name || '',
      picture: data.picture || '',
      refreshToken: tokens.refresh_token || '',
    };
  },
};
