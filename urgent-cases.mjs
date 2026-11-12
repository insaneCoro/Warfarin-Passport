/** Review priority, not a diagnosis. Red target flags do not all imply an emergency. */
export function urgentCase(p,today){
 const result=[...(p.results||[])].sort((a,b)=>String(a.date).localeCompare(String(b.date))).at(-1);if(!result||!(Number(result.value)>0))return null;
 const inr=Number(result.value),low=Number(p.targetLow),mechanical=/mechanical|prosthetic/i.test(p.diagnosis||''),thrombotic=p.riskLevel==='high'&&['thrombosis','both'].includes(p.riskCategory);
 let reason='',level='urgent';
 if(inr>=10){reason='Very high INR — urgent clinician / reversal review';level='critical';}
 else if(inr>=4.5)reason='High INR — prompt clinician review';
 else if(inr<1.5)reason='Very low INR — prompt thrombotic-risk assessment';
 else if(low>0&&inr<low&&(mechanical||thrombotic))reason='Below-target INR with high thrombotic risk — prompt clinician review';
 if(!reason)return null;
 const stale=!result.date||result.date>today||Date.parse(today)-Date.parse(result.date)>7*86400000;
 return {mrn:p.mrn,name:p.name,inr,date:result.date,reason,level,stale,rank:level==='critical'?0:inr>=4.5?1:2};
}
export function urgentCases(patients,today){return patients.map(p=>urgentCase(p,today)).filter(Boolean).sort((a,b)=>a.rank-b.rank||String(a.date).localeCompare(String(b.date)));}
