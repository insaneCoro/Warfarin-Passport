import {test} from 'node:test';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
import worker,{verifyToken} from '../gateway/worker.mjs';
const b64=x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url');
test('Firebase JWT requires signature, project, expiry, issuer and subject',async()=>{
 const pair=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);const jwk=await webcrypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='test';
 const fetcher=async()=>new Response(JSON.stringify({keys:[jwk]}));const now=Math.floor(Date.now()/1000);
 async function token(overrides={}){const start=b64({alg:'RS256',kid:'test'})+'.'+b64({aud:'test-project',iss:'https://securetoken.google.com/test-project',sub:'staff',iat:now,auth_time:now,exp:now+3600,...overrides});return start+'.'+Buffer.from(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(start))).toString('base64url');}
 assert.equal((await verifyToken(await token(),'test-project',fetcher)).uid,'staff');assert.equal((await verifyToken(await token({email_verified:true}),'test-project',fetcher)).emailVerified,true);assert.equal((await verifyToken(await token({email_verified:'true'}),'test-project',fetcher)).emailVerified,false);
 for(const claim of [{aud:'wrong'},{exp:now-1},{iss:'wrong'},{sub:''},{iat:now+600}])await assert.rejects(()=>token(claim).then(t=>verifyToken(t,'test-project',fetcher)));
 const good=await token();await assert.rejects(()=>verifyToken(good.slice(0,-12)+'AAAAAAAAAAAA','test-project',fetcher));
});
test('gateway rejects other origins and unsigned requests',async()=>{const env={ALLOWED_ORIGIN:'https://example.org'};assert.equal((await worker.fetch(new Request('https://api.example.org',{method:'POST',headers:{Origin:'https://attacker.org'}}),env)).status,403);assert.equal((await worker.fetch(new Request('https://api.example.org',{method:'POST',headers:{Origin:'https://example.org'}}),env)).status,503);});
