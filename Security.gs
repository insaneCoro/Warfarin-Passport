/**
 * Apps Script endpoint must not be called directly by the browser.
 * The Cloudflare Worker signs all approved requests with a private shared key.
 * WARNING: Deploy Apps Script as web app (execute as owner, access Anyone) ONLY
 * after HMAC secret, Firebase verification, and user allowlist have been tested.
 * Endpoint alone is NOT safe for clinical production.
 */
function doPost(e){
  let output;
  try{
    const req=JSON.parse(e?.postData?.contents||'{}');
    const secret=PropertiesService.getScriptProperties().getProperty('GATEWAY_HMAC_SECRET');
    if(!secret||secret.length<32)throw Error('Server signing key is missing');
    const ts=Number(req.ts),nonce=String(req.nonce||''),bodyB64=String(req.payload||''),sig=String(req.signature||'');
    if(!Number.isFinite(ts)||Math.abs(Date.now()-ts)>300000)throw Error('Request expired');
    if(!/^[a-f0-9-]{20,64}$/i.test(nonce)||bodyB64.length>250000)throw Error('Invalid request envelope');
    const signable='v1\n'+ts+'\n'+nonce+'\n'+bodyB64;
    const expected=Utilities.computeHmacSha256Signature(signable,secret).map(v=>('0'+((v+256)%256).toString(16)).slice(-2)).join('');
    if(!constantTimeEqual_(sig,expected))throw Error('Unauthorized request');
    const cache=CacheService.getScriptCache(),nonceKey='nonce-'+nonce;
    withLock_(()=>{if(cache.get(nonceKey))throw Error('Duplicate request');cache.put(nonceKey,'1',300);});
    const raw=Utilities.newBlob(Utilities.base64DecodeWebSafe(bodyB64)).getDataAsString('UTF-8');
    const payload=JSON.parse(raw);
    if(!payload||typeof payload.action!=='string'||!payload.user?.uid)throw Error('Invalid request');
    const result=dispatch_(payload);
    output={ok:true,result};
  }catch(err){
    // Never include request payloads, signatures, or PHI in logs.
    output={ok:false,error:String(err.message||'Request rejected').slice(0,160)};
  }
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}
function constantTimeEqual_(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
function authorized_(identity){const u=findRow_('Users','firebaseUid',identity.uid);if(!u||String(u.active).toLowerCase()!=='true'||!['admin','subadmin','clinician'].includes(u.role))throw Error('User is not approved');
  // Email is supplementary only; never trust identity from browser without signed gateway assertion.
  if(u.email&&identity.email&&String(u.email).toLowerCase()!==String(identity.email).toLowerCase())throw Error('User email mismatch');
  return {uid:u.firebaseUid,role:u.role,email:u.email,displayName:u.displayName};
}
function requireAdmin_(user){if(user.role!=='admin')throw Error('Admin permission required')}
function dispatch_(payload){const user=authorized_(payload.user),a=payload.action,p=payload.params||{};
 const read=['auth.me','patients.list','patients.get','followups.list','users.list'];
 if(!read.includes(a)&&!['patients.create','patients.update','encounters.create','followups.complete','followups.record','decisions.approve','inventory.set','notes.create','users.upsert','demo.seed'].includes(a))throw Error('Unsupported action');
 if(a==='auth.me')return user;
 if(a==='demo.seed')return demoSeed_(p,user);
 if(a==='patients.list')return patientsList_(p,user);
 if(a==='patients.get')return patientGet_(p,user);
 if(a==='patients.create')return patientCreate_(p,user);
 if(a==='patients.update')return patientUpdate_(p,user);
 if(a==='encounters.create')return encounterCreate_(p,user);
 if(a==='followups.list')return followupList_(p,user);
 if(a==='followups.record')return followupRecord_(p,user);
 if(a==='decisions.approve')return decisionApprove_(p,user);
 if(a==='followups.complete')return followupComplete_(p,user);
 if(a==='inventory.set')return inventorySet_(p,user);
 if(a==='notes.create')return noteCreate_(p,user);
 if(a==='users.list'){requireAdmin_(user);return allRows_('Users').map(u=>({uid:u.firebaseUid,email:u.email,role:u.role,active:u.active,displayName:u.displayName}))}
 if(a==='users.upsert')return userUpsert_(p,user);
}
