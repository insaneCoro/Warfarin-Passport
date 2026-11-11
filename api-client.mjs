import {backendErrorCode, connectionErrorMessage, safeConnectionCode} from './connection-errors.mjs';
import {firebaseSignInError} from './auth-errors.mjs';
import config from './config.js?v=demo-and-staff-3';
import {usesConnectedApi} from './mode-utils.mjs';
let session=null;
export const connectionAvailable=config.enabled;
export const connected=usesConnectedApi(config.enabled,globalThis.location?.search||'');
export async function signIn(email,password){
 if(!connected||!config.gatewayUrl.startsWith('https://'))throw Error('Connection not configured');
 const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.firebaseApiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:String(email||'').trim(),password,returnSecureToken:true})});
 const data=await r.json();if(!r.ok)throw Error(firebaseSignInError(data.error?.message));
 session={token:data.idToken,expires:Date.now()+Number(data.expiresIn)*1000};
 try{return await api('auth.me',{});}catch(err){session=null;throw Error(connectionErrorMessage(err.connectionCode||'GATEWAY_NETWORK'));}
}
export function signOut(){session=null;}
export async function api(action,params){
 if(!session||session.expires<=Date.now()){session=null;throw Error('Sign in again; session expired');}
 const r=await fetch(config.gatewayUrl,{method:'POST',headers:{Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'},body:JSON.stringify({action,params}),cache:'no-store'});
 let data;try{data=await r.json();}catch{const error=Error('Invalid API response');error.connectionCode='GATEWAY_NETWORK';throw error;}if(!r.ok||!data.ok){const error=Error(data.error||'Save failed');error.connectionCode=safeConnectionCode(data.errorCode)||backendErrorCode(data.error);throw error;}return data.result;
}
export function patientFromApi(x){
 const p=x.patient;
 return {...p,results:x.results.map(r=>({id:r.id,date:r.testDate,value:r.inr,enteredBy:r.enteredBy})),dosePlans:x.dosePlans.map(d=>{const approval=x.approvals?.find(a=>a.recordId===d.encounterId);return {...d,date:d.effectiveDate,daily:['sun','mon','tue','wed','thu','fri','sat'].map(k=>Number(d[k])),previousDaily:d.previousDaily?JSON.parse(d.previousDaily):null,previousWeekly:d.previousWeeklyMg===''?null:d.previousWeeklyMg,weekly:d.weeklyMg,percentChange:d.percentChange===''?null:d.percentChange,enteredBy:d.createdBy,enteredAt:d.createdAt,approvedBy:approval?.actorUid,approvedAt:approval?.timestamp};}),encounters:x.encounters.map(e=>({...e,date:e.testDate,enteredBy:e.createdBy})),notes:x.notes.map(n=>({...n,date:n.noteDate,by:n.createdBy})),inventory:x.inventory.map(i=>({...i,strength:i.strengthMg,date:i.confirmedDate})),followups:x.followups.map(f=>({...f,inrDate:f.inrCheckDate,callDate:f.callDueDate,attempts:x.attempts.filter(a=>a.followupId===f.id).map(a=>({...a,actor:a.createdBy,timestamp:a.createdAt}))}))};
}
