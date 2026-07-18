import { gmailService } from './gmail.service.js';
import { graphService } from './graph.service.js';
import { ApiError } from '../utils/ApiError.js';

// Pick the mailbox provider for a user. Both services expose the same interface
// (listInbox / getThread / reply / listBounces), so callers stay provider-agnostic.
// Google takes precedence if somehow both are connected.
export function mailboxFor(user) {
  if (user?.googleRefreshToken) return gmailService;
  if (user?.microsoftRefreshToken) return graphService;
  throw ApiError.badRequest('Connect Google or Microsoft to use your inbox');
}
