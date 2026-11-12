/** Preserve the pre-decision baseline when reviewing an already-saved INR. */
export function latestAssessment(patient,result){
 if(!result)return {};
 const encounters=(patient.encounters||[]).filter(e=>result.encounterId?e.id===result.encounterId:e.date===result.date&&Number(e.inr)===Number(result.value));
 if(encounters.length!==1)return {};
 try{const raw=typeof encounters[0].reviewFactors==='string'?JSON.parse(encounters[0].reviewFactors):encounters[0].reviewFactors;return Object.fromEntries(['bleeding','missed','interactions','illness','recentChange','baselineConfirmed'].filter(k=>['yes','no','unknown'].includes(raw?.[k])).map(k=>[k,raw[k]]));}catch{return {};}
}
export function reviewBaseline(patient,result){
 const plans=patient.dosePlans||[],decision=result?.encounterId?plans.find(p=>p.encounterId===result.encounterId):null;
 const isFixture=decision&&/^synthetic-fixture-v1-p[1-7]-dose$/.test(decision.id);
 if(decision&&!isFixture){
  const previous=Number(decision.previousWeekly??decision.previousWeeklyMg);
  return {weekly:previous>0?previous:0,decision,kind:previous>0?'Previous regimen before this saved decision':'Previous regimen unavailable'};
 }
 const current=plans.at(-1),weekly=current?.daily?.reduce((a,b)=>a+Number(b),0)||0;
 return {weekly,decision:null,kind:'Recorded maintenance regimen — verify before use'};
}
export function latestResult(patient){return (patient.results||[]).map((r,i)=>({r,i})).sort((a,b)=>String(a.r.date).localeCompare(String(b.r.date))||String(a.r.enteredAt||'').localeCompare(String(b.r.enteredAt||''))||a.i-b.i).at(-1)?.r;}
