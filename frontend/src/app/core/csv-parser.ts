export interface CsvContact {
  name: string;
  company: string;
  position: string;
  email: string;
}

/** A parsed row plus why it is (or isn't) importable. */
export interface CsvContactRow extends CsvContact {
  /** 1-based line number in the source file, for pointing at bad rows. */
  line: number;
  status: 'new' | 'duplicate' | 'invalid';
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
 * Smart CSV → contacts, keeping every data row and labelling it. Auto-detects the
 * Email / Name / Company / Title columns and handles quoted fields, so it works
 * regardless of column order or extra columns (S.No, Category, etc.).
 *
 * Unlike `parseContactsCsv`, rows that can't be imported are returned as
 * `invalid` (no usable email) or `duplicate` (email repeated later in the file)
 * rather than dropped, so an import preview can show the user what was skipped.
 * Banner and blank rows still fall out as `invalid`.
 */
export function parseContactsCsvRows(text: string): CsvContactRow[] {
  const lines = text.split(/\r?\n/);
  if (!lines.some((l) => l.trim().length)) return [];

  // Keep the source line number with each row so the preview can point at bad rows.
  const grid = lines
    .map((l, i) => ({ cells: parseCsvLine(l), line: i + 1, blank: !l.trim().length }))
    .filter((r) => !r.blank);

  const headerIdx = grid.findIndex((r) => r.cells.some((c) => /e-?mail/i.test(c)));
  let emailCol = -1, nameCol = -1, companyCol = -1, titleCol = -1;
  if (headerIdx >= 0) {
    const h = grid[headerIdx].cells.map((c) => c.toLowerCase());
    emailCol = h.findIndex((c) => /e-?mail/.test(c));
    nameCol = h.findIndex((c) => /name/.test(c));
    companyCol = h.findIndex((c) => /company|organi[sz]ation|\borg\b/.test(c));
    titleCol = h.findIndex((c) => /title|position|role|designation/.test(c));
  }

  const rows: CsvContactRow[] = [];
  const seen = new Set<string>();
  for (let i = headerIdx >= 0 ? headerIdx + 1 : 0; i < grid.length; i++) {
    const { cells, line } = grid[i];
    let email = emailCol >= 0 ? cells[emailCol] || '' : '';
    if (!EMAIL.test(email)) email = cells.find((c) => EMAIL.test(c)) || '';
    email = email.trim().toLowerCase();

    const valid = EMAIL.test(email);
    const status: CsvContactRow['status'] = !valid ? 'invalid' : seen.has(email) ? 'duplicate' : 'new';
    if (status === 'new') seen.add(email);

    rows.push({
      line,
      status,
      name: (nameCol >= 0 ? cells[nameCol] : '') || '',
      company: (companyCol >= 0 ? cells[companyCol] : '') || '',
      position: (titleCol >= 0 ? cells[titleCol] : '') || '',
      email: valid ? email : (emailCol >= 0 ? cells[emailCol] || '' : '').trim(),
    });
  }
  return rows;
}

/**
 * Smart CSV → importable contacts: `parseContactsCsvRows` with the banner, blank,
 * invalid and duplicate rows dropped.
 */
export function parseContactsCsv(text: string): CsvContact[] {
  return parseContactsCsvRows(text)
    .filter((r) => r.status === 'new')
    .map(({ name, company, position, email }) => ({ name, company, position, email }));
}
