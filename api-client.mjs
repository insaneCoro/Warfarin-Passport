import config from './config.js';
let session=null;
export const connected=config.enabled;
export async function signIn(email,password){
 if(!connected||!config.gatewayUrl.startsWith('https://'))throw Error('Connection not configured');
 const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.firebaseApiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
 const data=await r.json();if(!r.ok)throw Error('Sign-in failed');
 session={token:data.idToken,expires:Date.now()+Number(data.expiresIn)*1000};
 try{return await api('auth.me',{});}catch(e){session=null;throw e;}
}
export function signOut(){session=null;}
export async function api(action,params){
 if(!session||session.expires<=Date.now()){session=null;throw Error('Sign in again; session expired');}
 const r=await fetch(config.gatewayUrl,{method:'POST',headers:{Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'},body:JSON.stringify({action,params}),cache:'no-store'});
 const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Save failed');return data.result;
}
export function patientFromApi(x){
 const p=x.patient;
 return {...p,results:x.results.map(r=>({id:r.id,date:r.testDate,value:r.inr,enteredBy:r.enteredBy})),dosePlans:x.dosePlans.map(d=>{const approval=x.approvals?.find(a=>a.recordId===d.encounterId);return {...d,date:d.effectiveDate,daily:['sun','mon','tue','wed','thu','fri','sat'].map(k=>Number(d[k])),previousDaily:d.previousDaily?JSON.parse(d.previousDaily):null,previousWeekly:d.previousWeeklyMg===''?null:d.previousWeeklyMg,weekly:d.weeklyMg,percentChange:d.percentChange===''?null:d.percentChange,enteredBy:d.createdBy,enteredAt:d.createdAt,approvedBy:approval?.actorUid,approvedAt:approval?.timestamp};}),encounters:x.encounters.map(e=>({...e,date:e.testDate,enteredBy:e.createdBy})),notes:x.notes.map(n=>({...n,date:n.noteDate,by:n.createdBy})),inventory:x.inventory.map(i=>({...i,strength:i.strengthMg,date:i.confirmedDate})),followups:x.followups.map(f=>({...f,inrDate:f.inrCheckDate,callDate:f.callDueDate,attempts:x.attempts.filter(a=>a.followupId===f.id).map(a=>({...a,actor:a.createdBy,timestamp:a.createdAt}))}))};
}
