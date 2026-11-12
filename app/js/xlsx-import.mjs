/**
 * Reads the clinic's Excel patient register in the browser (the file never leaves the device except as
 * the import request to the clinic's own backend). No third-party library: an .xlsx file is a zip of XML
 * files, read here with the browser's built-in DecompressionStream.
 */

async function unzip(buffer) {
  const view = new DataView(buffer),
    bytes = new Uint8Array(buffer),
    files = {};
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw Error('This is not an Excel (.xlsx) file');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    const method = view.getUint16(offset + 10, true),
      size = view.getUint32(offset + 20, true),
      nameLength = view.getUint16(offset + 28, true),
      extraLength = view.getUint16(offset + 30, true),
      commentLength = view.getUint16(offset + 32, true),
      local = view.getUint32(offset + 42, true),
      name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (
      !/^xl\/(worksheets\/sheet\d+|sharedStrings|workbook)\.xml$|^xl\/_rels\/workbook\.xml\.rels$/.test(name)
    )
      continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true),
      data = bytes.subarray(start, start + size);
    files[name] =
      method === 0
        ? decoder.decode(data)
        : await new Response(
            new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
          ).text();
  }
  return files;
}

const xml = (text) => new DOMParser().parseFromString(text, 'application/xml');
const colIndex = (ref) =>
  [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** Returns { sheetName: rows[][] } with cell values as strings or numbers. */
export async function readWorkbook(buffer) {
  const files = await unzip(buffer);
  const shared = files['xl/sharedStrings.xml']
    ? [...xml(files['xl/sharedStrings.xml']).getElementsByTagName('si')].map((si) =>
        [...si.getElementsByTagName('t')].map((t) => t.textContent).join(''),
      )
    : [];
  const rels = Object.fromEntries(
    [...xml(files['xl/_rels/workbook.xml.rels'] || '<r/>').getElementsByTagName('Relationship')].map((r) => [
      r.getAttribute('Id'),
      'xl/' + r.getAttribute('Target').replace(/^\/?xl\//, ''),
    ]),
  );
  const sheets = {};
  for (const sheet of xml(files['xl/workbook.xml'] || '<r/>').getElementsByTagName('sheet')) {
    const path = rels[sheet.getAttribute('r:id')];
    if (!files[path]) continue;
    const rows = [];
    for (const row of xml(files[path]).getElementsByTagName('row')) {
      const values = [];
      for (const cell of row.getElementsByTagName('c')) {
        const type = cell.getAttribute('t'),
          raw = cell.getElementsByTagName('v')[0]?.textContent ?? '',
          inline = cell.getElementsByTagName('t')[0]?.textContent;
        values[colIndex(cell.getAttribute('r'))] =
          type === 's'
            ? shared[Number(raw)]
            : type === 'inlineStr'
              ? inline
              : raw === ''
                ? ''
                : isNaN(raw)
                  ? raw
                  : Number(raw);
      }
      rows[Number(row.getAttribute('r')) - 1] = values;
    }
    sheets[sheet.getAttribute('name')] = rows;
  }
  return sheets;
}

const text = (v) => (v === undefined || v === null ? '' : String(v).trim());
/** Excel date serial number or yyyy-mm-dd / dd/mm/yyyy text → yyyy-mm-dd, else ''. */
export function excelDate(v) {
  if (typeof v === 'number' && v > 20000 && v < 80000)
    return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10);
  const s = text(v);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}
const number = (v) => {
  const n = Number(text(v).replace(',', '.'));
  return text(v) !== '' && Number.isFinite(n) ? n : '';
};
function addDays(iso, days) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Converts the register sheet (header row containing "MRN") into import rows, with warnings.
 * Repeated "Date of INR" / "INR" / "plan change" column groups become dated INR results.
 */
export function registerRows(sheets) {
  const name = Object.keys(sheets).find((n) => /patient/i.test(n)) || Object.keys(sheets)[0];
  const rows = sheets[name] || [];
  const headerAt = rows.findIndex((r) => r?.some((v) => /^mrn$/i.test(text(v))));
  if (headerAt < 0) throw Error('Could not find a header row with an "MRN" column');
  const headers = rows[headerAt].map((h) => text(h).toLowerCase());
  const find = (re) => headers.findIndex((h) => re.test(h));
  const col = {
    mrn: find(/^mrn$/),
    name: find(/patient name|^name$/),
    age: find(/^age/),
    phone: find(/mobile|phone/),
    proxy: find(/proxy|caregiver/),
    indication: find(/indication|diagnosis/),
    site: find(/phc|testing site/),
    target: find(/target/),
    lastBefore: find(/before enrol/),
    enrollment: find(/enrol/),
    next: find(/^next inr/),
  };
  if (col.enrollment === col.lastBefore)
    col.enrollment = headers.findIndex((h, i) => /enrol/.test(h) && i !== col.lastBefore);
  // INR groups: each "date of inr" column with the next "inr" and "plan change" columns after it.
  const groups = [];
  headers.forEach((h, i) => {
    if (!/date of inr/.test(h)) return;
    const after = headers.slice(i + 1);
    const inr = after.findIndex((x) => /\binr\d*$/.test(x) && !/date/.test(x));
    const plan = after.findIndex((x) => /plan change/.test(x));
    groups.push({ date: i, inr: inr < 0 ? -1 : i + 1 + inr, plan: plan < 0 ? -1 : i + 1 + plan, label: h });
  });
  const out = [],
    warnings = [];
  for (const r of rows.slice(headerAt + 1)) {
    if (!r) continue;
    const mrn = text(r[col.mrn]),
      patient = text(r[col.name]);
    if (!mrn && !patient) continue;
    const where = mrn || patient;
    let phone = text(r[col.phone]);
    if (/^5\d{8}$/.test(phone)) phone = '0' + phone; // Excel drops the leading zero of mobile numbers
    const target = text(r[col.target]).match(/([\d.]+)\s*(?:to|-|–)\s*([\d.]+)/i);
    if (!target) warnings.push(`${where}: target INR not recognised ("${text(r[col.target])}")`);
    const results = [],
      planNotes = [];
    for (const g of groups) {
      const date = excelDate(r[g.date]),
        inr = number(r[g.inr]);
      if (date && inr !== '') results.push({ date, inr });
      else if (text(r[g.date]) || text(r[g.inr]))
        warnings.push(`${where}: incomplete INR entry (${g.label})`);
      if (g.plan >= 0 && text(r[g.plan]))
        planNotes.push(`${g.label.replace(/ ?date of inr\d*/, '')}: ${text(r[g.plan])}`);
    }
    results.sort((a, b) => a.date.localeCompare(b.date));
    const nextRaw = r[col.next];
    let nextInrDate = excelDate(nextRaw);
    const interval = text(nextRaw).match(/^(\d+)\s*(week|day)s?$/i);
    if (!nextInrDate && interval && results.length)
      nextInrDate = addDays(results.at(-1).date, Number(interval[1]) * (/week/i.test(interval[2]) ? 7 : 1));
    if (!nextInrDate && text(nextRaw)) planNotes.push('Next INR: ' + text(nextRaw));
    if (!mrn) warnings.push(`${patient}: no MRN — will not be imported`);
    out.push({
      mrn,
      name: patient,
      ageText: text(r[col.age]),
      phone,
      caregiver: text(r[col.proxy]),
      diagnosis: text(r[col.indication]),
      testingSite: text(r[col.site]),
      targetLow: target ? Number(target[1]) : '',
      targetHigh: target ? Number(target[2]) : '',
      enrollmentDate: excelDate(r[col.enrollment]),
      enrollmentInr: number(r[col.lastBefore]),
      results,
      nextInrDate,
      planNotes: planNotes.join('; '),
    });
  }
  return { rows: out, warnings };
}
