import {backendErrorCode, connectionErrorMessage, safeConnectionCode} from './connection-errors.mjs?v=care-5';
import {firebaseSignInError} from './auth-errors.mjs';
import config from './config.js?v=demo-and-staff-3';
import {usesConnectedApi} from './mode-utils.mjs?v=care-5';
let session=null,refreshing=null;
export const connectionAvailable=config.enabled;
export const connected=usesConnectedApi(config.enabled,globalThis.location?.search||'');
export async function signIn(email,password,action='auth.me'){
 if(!connected||!config.gatewayUrl.startsWith('https://'))throw Error('Connection not configured');
 const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.firebaseApiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:String(email||'').trim(),password,returnSecureToken:true})});
 const data=await r.json();if(!r.ok)throw Error(firebaseSignInError(data.error?.message));
 session={token:data.idToken,refreshToken:data.refreshToken,expires:Date.now()+Number(data.expiresIn)*1000};
 try{const user=await api(action,{});session.workspaceId=user.workspaceId;return user;}catch(err){session=null;throw Error(action==='portal.me'?'Verify your email and ask the clinic to link your account. If access was removed, contact the clinic.':connectionErrorMessage(err.connectionCode||'GATEWAY_NETWORK'));}
}
export function signOut(){session=null;refreshing=null;}
const readActions=new Set(['auth.me','patients.list','patients.get','followups.list','users.list','messages.list','system.status','portal.me','portal.passport','access.list','requests.list','communications.validate']);
async function renewSession(force=false){
 const current=session;if(!current)throw Error('Please sign in again; your session has ended.');
 if(!force&&current.expires>Date.now()+60000)return current;
 if(!current.refreshToken){if(current.expires>Date.now()&&!force)return current;throw Error('Please sign in again; your session has ended.');}
 if(refreshing)return refreshing;
 const promise=(async()=>{let r;try{r=await timedFetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(config.firebaseApiKey)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:current.refreshToken})});}catch{throw Error('Connection interrupted. Your form is still open. Reconnect and try again.');}
  const data=await r.json();if(!r.ok||!data.id_token){if(session===current)session=null;throw Error('Please sign in again; your session has ended.');}
  if(session!==current)throw Error('You signed out. Sign in again to continue.');current.token=data.id_token;current.refreshToken=data.refresh_token||current.refreshToken;current.expires=Date.now()+Number(data.expires_in)*1000;return current;
 })();refreshing=promise;try{return await promise;}finally{if(refreshing===promise)refreshing=null;}
}
async function timedFetch(url,options){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}}
export async function api(action,params,attempt=0,renewed=false){
 const current=await renewSession();let r;
 try{r=await timedFetch(config.gatewayUrl,{method:'POST',headers:{Authorization:`Bearer ${current.token}`,'Content-Type':'application/json'},body:JSON.stringify({action,params:{...params,...(current.workspaceId!==undefined?{expectedWorkspace:current.workspaceId}:{})}}),cache:'no-store'});}catch{
  if(session!==current)throw Error('You signed out. Sign in again to continue.');
  if(readActions.has(action)&&attempt<1){await new Promise(r=>setTimeout(r,400));return api(action,params,attempt+1,renewed);}
  throw Error(readActions.has(action)?'Connection interrupted. Keep this page open and use Refresh clinic when connected.':'Connection interrupted. The save may have reached the clinic. Keep your form open and check the patient record before retrying.');
 }
 if(session!==current)throw Error('You signed out. Sign in again to continue.');
 if(r.status===401&&!renewed&&current.refreshToken){await renewSession(true);return api(action,params,attempt,true);}
 let data;try{data=await r.json();}catch{if(readActions.has(action)&&attempt<1)return api(action,params,attempt+1,renewed);const error=Error('The clinic response could not be read. Refresh the patient before retrying a save.');error.connectionCode='GATEWAY_NETWORK';throw error;}
 if(!r.ok||!data.ok){const error=Error(data.error||'Save failed');error.connectionCode=safeConnectionCode(data.errorCode)||backendErrorCode(data.error);
  if(error.connectionCode==='SERVER_BUSY'&&attempt<2){await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));return api(action,params,attempt+1,renewed);}
  if(readActions.has(action)&&attempt<1&&[502,503,504].includes(r.status)){await new Promise(r=>setTimeout(r,400));return api(action,params,attempt+1,renewed);}
  if(error.connectionCode==='SERVER_BUSY')error.message='Clinic is busy saving another request. Please wait a moment and retry.';throw error;
 }return data.result;
}
export function patientFromApi(x){
 const p=x.patient;
 return {...p,communications:x.communications||[],results:x.results.map(r=>({id:r.id,date:r.testDate,value:r.inr,encounterId:r.encounterId,enteredAt:r.enteredAt,enteredBy:r.enteredBy,targetLow:r.targetLow,targetHigh:r.targetHigh})),dosePlans:x.dosePlans.map(d=>{const approval=x.approvals?.find(a=>a.recordId===d.encounterId);return {...d,date:d.effectiveDate,daily:['sun','mon','tue','wed','thu','fri','sat'].map(k=>Number(d[k])),previousDaily:d.previousDaily?JSON.parse(d.previousDaily):null,previousWeekly:d.previousWeeklyMg===''?null:d.previousWeeklyMg,weekly:d.weeklyMg,percentChange:d.percentChange===''?null:d.percentChange,enteredBy:d.createdBy,enteredAt:d.createdAt,approvedBy:approval?.actorUid,approvedAt:approval?.timestamp};}),encounters:x.encounters.map(e=>({...e,date:e.testDate,enteredBy:e.createdBy})),notes:x.notes.map(n=>({...n,date:n.noteDate,by:n.createdBy})),inventory:x.inventory.map(i=>({...i,strength:i.strengthMg,date:i.confirmedDate})),followups:x.followups.map(f=>({...f,inrDate:f.inrCheckDate,callDate:f.callDueDate,attempts:x.attempts.filter(a=>a.followupId===f.id).map(a=>({...a,actor:a.createdBy,timestamp:a.createdAt}))}))};
}

async function accountRequest(operation,body){
 if(!connected)throw Error('Use Staff sign-in to manage your account');
 const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${encodeURIComponent(config.firebaseApiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await r.json();if(!r.ok)throw Error('Account request could not be completed. If you already have an account, use Sign in or Reset password. Passwords must contain at least 12 characters.');return data;
}
export async function createStaffAccount(email,password){
 if(String(password).length<12)throw Error('Use a password of at least 12 characters');
 const data=await accountRequest('signUp',{email:String(email).trim(),password,returnSecureToken:true});
 await accountRequest('sendOobCode',{requestType:'VERIFY_EMAIL',idToken:data.idToken});
}
export async function sendAccountEmail(email,password,verification=false){
 if(verification){const data=await accountRequest('signInWithPassword',{email:String(email).trim(),password,returnSecureToken:true});await accountRequest('sendOobCode',{requestType:'VERIFY_EMAIL',idToken:data.idToken});}
 else {try{await accountRequest('sendOobCode',{requestType:'PASSWORD_RESET',email:String(email).trim()});}catch{} }
}
