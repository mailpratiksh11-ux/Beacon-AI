export interface CsvContact {
  name: string;
  company: string;
  position: string;
  email: string;
}

const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Parse one CSV line, honoring quoted fields (commas inside quotes, escaped "").
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false; }
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Smart CSV → contacts. Auto-detects the Email / Name / Company / Title columns,
 * skips banner & blank rows, removes duplicates, and handles quoted fields.
 * Works regardless of column order or extra columns (S.No, Category, etc.).
 */
export function parseContactsCsv(text: string): CsvContact[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  const grid = lines.map(parseCsvLine);
  if (!grid.length) return [];

  const headerIdx = grid.findIndex((r) => r.some((c) => /e-?mail/i.test(c)));
  let emailCol = -1, nameCol = -1, companyCol = -1, titleCol = -1;
  if (headerIdx >= 0) {
    const h = grid[headerIdx].map((c) => c.toLowerCase());
    emailCol = h.findIndex((c) => /e-?mail/.test(c));
    nameCol = h.findIndex((c) => /name/.test(c));
    companyCol = h.findIndex((c) => /company|organi[sz]ation|\borg\b/.test(c));
    titleCol = h.findIndex((c) => /title|position|role|designation/.test(c));
  }

  const rows: CsvContact[] = [];
  const seen = new Set<string>();
  for (let i = headerIdx >= 0 ? headerIdx + 1 : 0; i < grid.length; i++) {
    const cells = grid[i];
    let email = emailCol >= 0 ? cells[emailCol] || '' : '';
    if (!EMAIL.test(email)) email = cells.find((c) => EMAIL.test(c)) || '';
    email = email.trim().toLowerCase();
    if (!EMAIL.test(email) || seen.has(email)) continue; // skip banners / blanks / dupes
    seen.add(email);
    rows.push({
      name: (nameCol >= 0 ? cells[nameCol] : '') || '',
      company: (companyCol >= 0 ? cells[companyCol] : '') || '',
      position: (titleCol >= 0 ? cells[titleCol] : '') || '',
      email,
    });
  }
  return rows;
}
