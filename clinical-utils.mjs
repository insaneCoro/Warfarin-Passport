export function doseSummary(previous, daily) {
  const valid = a => Array.isArray(a) && a.length === 7 && a.every(x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100);
  if (!valid(daily) || (previous != null && !valid(previous))) throw Error('Seven valid daily doses required');
  const total = a => Math.round(a.reduce((s,x)=>s+x,0)*100)/100;
  const previousWeekly = previous == null ? null : total(previous), weekly = total(daily);
  return {previousDaily: previous == null ? null : [...previous], daily:[...daily], previousWeekly, weekly, percentChange:previousWeekly > 0 ? Math.round((weekly-previousWeekly)/previousWeekly*10000)/100 : null};
}
export function followupAttempt(followup, input, actor, timestamp) {
  if(followup.status === 'Completed') throw Error('Follow-up already completed');
  if(!['Contacted','No answer','Unable to contact','Escalated'].includes(input.outcome)) throw Error('Select a call outcome');
  if(!input.actions?.trim()) throw Error('Document clinical actions or the contact attempt');
  if(input.complete && !['Contacted','Escalated'].includes(input.outcome)) throw Error('Failed contact must remain pending');
  return {id:input.id, outcome:input.outcome, actions:input.actions.trim(), note:input.note || '', encounterId:input.encounterId || null, actor, timestamp, completed:input.complete === true};
}
export function referenceGuidance({inr, targetLow, targetHigh, previousWeekly, factors=''}) {
  const messages = ['Reference support only. A clinician must assess symptoms, adherence, interacting medicines, diet, illness and the timing of the last dose change.'];
  if(Number(inr)>=4.5) messages.push('High INR: prompt clinician review under the local critical-result protocol. Do not wait for a routine follow-up call.');
  if(/bleed|head injury|stroke|chest pain|breathless/i.test(factors)) messages.push('Potential emergency symptoms: arrange immediate emergency assessment according to local protocol.');
  if(!(targetLow>0 && targetHigh>targetLow)) messages.push('Individual target is missing: obtain the prescribed target before assessing control.');
  else if(inr>0) messages.push(`INR ${inr} is ${inr<targetLow?'below':inr>targetHigh?'above':'within'} the recorded target ${targetLow}–${targetHigh}. ${inr<targetLow?'Assess missed doses and thrombotic risk, including mechanical valves; seek clinician review.':''}`);
  messages.push(`Previous recorded weekly dose: ${previousWeekly == null?'unknown':previousWeekly+' mg'}. No dose change is calculated or applied.`);
  return messages;
}
