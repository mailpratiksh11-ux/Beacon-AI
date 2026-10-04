import { contactService } from '../services/contact.service.js';
import { emailService } from '../services/email.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Turn a `delivery` filter into the email lists the contact query needs.
 * Send outcome lives on email history, not on the contact, so it has to be
 * resolved per request:
 *   failed → bounced or failed at least once, and never delivered
 *   sent   → delivered / opened / pending
 *   never  → no send history at all
 */
async function deliveryFilter(userId, delivery) {
  if (!delivery || delivery === 'all') return {};
  const { sent, failed } = await emailService.recipientStatuses(userId);
  if (delivery === 'failed') return { emails: failed };
  if (delivery === 'sent') return { emails: sent };
  if (delivery === 'never') return { excludeEmails: [...sent, ...failed] };
  throw ApiError.badRequest('Unknown delivery filter');
}

// The filters a request may narrow contacts by, normalized for both list and bulk delete.
async function filtersFrom(userId, src = {}) {
  return {
    status: src.status,
    search: src.search,
    favorite: src.favorite,
    group: src.group,
    ...(await deliveryFilter(userId, src.delivery)),
  };
}

// --- CSV helpers ---------------------------------------------------------
const CSV_COLUMNS = ['Name', 'Email', 'Company', 'Position', 'Groups', 'Status', 'Favorite', 'Added'];

/** Quote a cell only when it needs it, doubling any embedded quotes. */
function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(c) {
  return [
    c.name || '',
    c.email || '',
    c.company || '',
    c.position || '',
    (c.groups || []).join('; '),
    c.status || 'active',
    c.favorite ? 'yes' : 'no',
    c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : '',
  ].map(csvCell).join(',');
}

export const contactController = {
  /**
   * Stream the contacts matching the current filters as CSV.
   * Uses the same filter normalization as list(), so what downloads is exactly
   * what the user is looking at.
   */
  export: asyncHandler(async (req, res) => {
    const filters = await filtersFrom(req.userId, req.query);
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="beacon-contacts-${stamp}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    res.write('﻿'); // BOM, so Excel reads the file as UTF-8
    res.write(CSV_COLUMNS.join(',') + '\r\n');

    const cursor = contactService.exportCursor(req.userId, filters);
    try {
      for await (const contact of cursor) {
        res.write(csvRow(contact) + '\r\n');
      }
      res.end();
    } catch (err) {
      // Headers are already sent, so there is no way to return a JSON error.
      // Close the stream; the client sees a truncated download rather than a hang.
      await cursor.close().catch(() => {});
      console.error('contact export failed:', err.message); // eslint-disable-line no-console
      res.destroy(err);
    }
  }),

  list: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const filters = await filtersFrom(req.userId, req.query);
    const { items, total } = await contactService.list(req.userId, { ...filters, page, limit });
    return paginated(res, items, { page, limit, total });
  }),

  bulkRemove: asyncHandler(async (req, res) => {
    const { contactIds, all } = req.body;
    const filters = all ? await filtersFrom(req.userId, req.body.filters || {}) : undefined;
    const { deleted } = await contactService.bulkRemove(req.userId, { contactIds, all: !!all, filters });
    return ok(res, { deleted }, `Deleted ${deleted} contact${deleted === 1 ? '' : 's'}`);
  }),

  groups: asyncHandler(async (req, res) => ok(res, await contactService.listGroups(req.userId))),

  bulkGroup: asyncHandler(async (req, res) => {
    const { contactIds, group, action, all } = req.body;
    const filters = all ? await filtersFrom(req.userId, req.body.filters || {}) : undefined;
    const result = await contactService.bulkGroup(req.userId, { contactIds, all: !!all, filters, group, action });
    return ok(res, result, action === 'remove' ? `Removed from “${result.group}”` : `Added to “${result.group}”`);
  }),

  get: asyncHandler(async (req, res) => ok(res, await contactService.getById(req.userId, req.params.id))),

  create: asyncHandler(async (req, res) => created(res, await contactService.create(req.userId, req.body), 'Contact created')),

  bulkImport: asyncHandler(async (req, res) => {
    const rows = req.body.contacts;
    if (!Array.isArray(rows) || rows.length === 0) throw ApiError.badRequest('Provide a non-empty "contacts" array');
    const result = await contactService.bulkCreate(req.userId, rows, req.body.groups);
    const n = result.inserted + result.updated;
    const into = result.groups.length ? ` into “${result.groups.join('”, “')}”` : '';
    return created(res, result, `Imported ${n} contact${n === 1 ? '' : 's'}${into}`);
  }),

  update: asyncHandler(async (req, res) => ok(res, await contactService.update(req.userId, req.params.id, req.body), 'Contact updated')),

  remove: asyncHandler(async (req, res) => {
    await contactService.remove(req.userId, req.params.id);
    return ok(res, null, 'Contact deleted');
  }),
};
