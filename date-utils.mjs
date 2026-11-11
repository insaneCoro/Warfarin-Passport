/** Calendar-day arithmetic independent of browser locale / daylight-saving shifts. */
export function addDays(iso, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Invalid ISO date');
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== iso) throw new Error('Invalid calendar date');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function todayRiyadh(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function dateLabel(iso) {
  if (!iso) return 'Not set';
  const [y,m,d] = iso.split('-').map(Number);
  if (!y || !m || !d) return 'Not set';
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d,12)));
}
export function ageFromDOB(dob, today) {
  if (!dob) return '—';
  const a=dob.split('-').map(Number), b=today.split('-').map(Number);
  if(a.length!==3||b.length!==3) return '—';
  return b[0]-a[0] - (b[1]<a[1] || (b[1]===a[1] && b[2]<a[2]) ? 1 : 0);
}
export function sumDose(daily) { return daily.reduce((acc,x)=>acc+Number(x||0),0); }
