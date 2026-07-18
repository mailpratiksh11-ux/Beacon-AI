import { env } from '../config/env.js';
import { decryptSecret } from '../utils/crypto.js';

// Delegated Microsoft Graph scopes: identity (OIDC) + offline access (refresh token)
// + read/send the signed-in user's Outlook mailbox.
const SCOPES = ['openid', 'email', 'profile', 'offline_access', 'User.Read', 'Mail.Read', 'Mail.Send'];

// `common` lets any work/school OR personal Microsoft account sign in.
const authority = () => `https://login.microsoftonline.com/${env.microsoftTenant || 'common'}/oauth2/v2.0`;

async function postForm(url, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.error || `Microsoft token request failed (${res.status})`);
  return data;
}

async function graphMe(accessToken) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Microsoft Graph /me failed (${res.status})`);
  return data;
}

export const microsoftService = {
  isConfigured() {
    return Boolean(env.microsoftClientId && env.microsoftClientSecret);
  },

  // URL to send the user to Microsoft's consent screen. `state` carries the return origin.
  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: env.microsoftClientId,
      response_type: 'code',
      redirect_uri: env.microsoftRedirectUri,
      response_mode: 'query',
      scope: SCOPES.join(' '),
      state,
      prompt: 'select_account',
    });
    return `${authority()}/authorize?${params.toString()}`;
  },

  // Exchange the auth code for tokens + basic profile info.
  async exchangeCode(code) {
    const tokens = await postForm(`${authority()}/token`, {
      client_id: env.microsoftClientId,
      client_secret: env.microsoftClientSecret,
      code,
      redirect_uri: env.microsoftRedirectUri,
      grant_type: 'authorization_code',
      scope: SCOPES.join(' '),
    });
    const me = await graphMe(tokens.access_token);
    return {
      microsoftId: me.id || '',
      email: String(me.mail || me.userPrincipalName || '').toLowerCase(),
      name: me.displayName || '',
      refreshToken: tokens.refresh_token || '',
    };
  },

  // Trade the stored refresh token for a fresh access token (Graph calls are short-lived).
  async accessTokenFor(user) {
    const refresh = decryptSecret(user.microsoftRefreshToken);
    if (!refresh) throw new Error('No Microsoft refresh token on file');
    const tokens = await postForm(`${authority()}/token`, {
      client_id: env.microsoftClientId,
      client_secret: env.microsoftClientSecret,
      grant_type: 'refresh_token',
      refresh_token: refresh,
      scope: SCOPES.join(' '),
    });
    return tokens.access_token;
  },
};
