import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export function credentialsFromClasp(config){
 const candidate=config.tokens?.default||config;
 const value=candidate.refresh_token?candidate:{client_id:config.oauth2ClientSettings?.clientId,client_secret:config.oauth2ClientSettings?.clientSecret,refresh_token:config.token?.refresh_token};
 if(!value.client_id||!value.client_secret||!value.refresh_token)throw Error('The CLASPRC_JSON secret needs a default clasp login with a refresh token. Re-run clasp login; do not share the credential in chat.');
 return {client_id:value.client_id,client_secret:value.client_secret,refresh_token:value.refresh_token};
}
export function mergeSource(remoteFiles,sources){
 const replacements=Object.keys(sources),manifest=remoteFiles.find(f=>f.name==='appsscript'&&f.type==='JSON');
 if(!manifest)throw Error('Existing project manifest was not found; refusing to replace the project.');
 if(JSON.parse(manifest.source).runtimeVersion!=='V8')throw Error('Enable V8 in the existing Apps Script project before deployment.');
 const managedFunctions=new Set(Object.values(sources).flatMap(source=>[...source.matchAll(/function\s+(\w+)\s*\(/g)].map(m=>m[1])));
 for(const file of remoteFiles.filter(f=>f.type==='SERVER_JS'&&!replacements.includes(f.name))){
  const overlap=[...file.source.matchAll(/function\s+(\w+)\s*\(/g)].some(m=>managedFunctions.has(m[1]));
  if(overlap)throw Error('An unmanaged script duplicates a managed function. Review the existing project before deployment.');
 }
 const files=remoteFiles.filter(f=>!replacements.includes(f.name)).map(({name,type,source})=>({name,type,source}));
 for(const [name,source]of Object.entries(sources))files.push({name,type:'SERVER_JS',source});
 return files;
}
export async function deployExisting({scriptId,deploymentId,credential,sources,description,publish=false,rollbackVersion=null,backup,fetcher=fetch}){
 if(!/^[\w-]{10,200}$/.test(scriptId||'')||!/^AKfy[\w-]{10,200}$/.test(deploymentId||''))throw Error('Set APPS_SCRIPT_ID and the existing APPS_SCRIPT_DEPLOYMENT_ID in repository Actions variables. They are different IDs.');
 const auth=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({...credential,grant_type:'refresh_token'})});
 if(!auth.ok)throw Error('Google deployment authentication failed. Renew the private clasp credential.');
 const {access_token}=await auth.json();if(!access_token)throw Error('Google did not return a deployment access token.');
 const base=`https://script.googleapis.com/v1/projects/${encodeURIComponent(scriptId)}`;
 async function api(suffix,method='GET',data){
  const r=await fetcher(base+suffix,{method,headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
  if(!r.ok)throw Error(`Apps Script ${method} request failed (HTTP ${r.status}). Verify API access, account permissions and target deployment; no database or Script Properties were changed by this tool.`);
  return r.json();
 }
 const deployment=await api('/deployments/'+encodeURIComponent(deploymentId));
 if(deployment.deploymentConfig?.scriptId!==scriptId)throw Error('Deployment does not belong to the selected existing project.');
 const previousVersion=deployment.deploymentConfig.versionNumber;
 if(rollbackVersion!==null){
  if(!publish||!Number.isInteger(rollbackVersion)||rollbackVersion<1)throw Error('Rollback needs --deploy and a positive existing version number.');
  await api('/versions/'+rollbackVersion);
  await api('/deployments/'+deploymentId,'PUT',{deploymentConfig:{...deployment.deploymentConfig,versionNumber:rollbackVersion,description:description||'Rollback existing deployment'}});
  return {published:true,previousVersion,version:rollbackVersion,rollback:true};
 }
 const remote=await api('/content'),files=mergeSource(remote.files||[],sources);
 if(backup)await backup({files:remote.files,deployment});
 if(!publish)return {published:false,previousVersion,fileCount:files.length};
 await api('/content','PUT',{files});
 const version=await api('/versions','POST',{description:description||'Warfarin Passport release'});
 await api('/deployments/'+deploymentId,'PUT',{deploymentConfig:{...deployment.deploymentConfig,versionNumber:version.versionNumber,description:description||'Warfarin Passport release'}});
 const verified=await api('/deployments/'+deploymentId);
 if(verified.deploymentConfig.versionNumber!==version.versionNumber)throw Error('Deployment version could not be verified. Check Apps Script deployment status before retrying.');
 return {published:true,previousVersion,version:version.versionNumber,fileCount:files.length};
}
async function main(){
 let config;try{config=JSON.parse(process.env.CLASPRC_JSON||'');}catch{throw Error('Add CLASPRC_JSON as a private repository Actions secret.');}
 const sources=Object.fromEntries(await Promise.all(['API','Database','Security'].map(async name=>[name,await readFile(new URL('../'+name+'.gs',import.meta.url),'utf8')])));
 const rollback=process.argv.find(a=>a.startsWith('--rollback-version='));
 const result=await deployExisting({scriptId:process.env.APPS_SCRIPT_ID,deploymentId:process.env.APPS_SCRIPT_DEPLOYMENT_ID,credential:credentialsFromClasp(config),sources,description:'Warfarin Passport '+(process.env.GITHUB_SHA||'local').slice(0,12),publish:process.argv.includes('--deploy'),rollbackVersion:rollback?Number(rollback.split('=')[1]):null,backup:async data=>{const dir=await mkdtemp(path.join(tmpdir(),'warfarin-code-backup-'));await writeFile(path.join(dir,'existing-project.json'),JSON.stringify(data),{mode:0o600});}});
 console.log(result.published?`Existing deployment updated: version ${result.previousVersion} → ${result.version}. Existing URL, Script Properties and database retained.`:`Read-only preflight passed (${result.fileCount} files). Add --deploy to publish; current deployment version ${result.previousVersion} is unchanged.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1});
