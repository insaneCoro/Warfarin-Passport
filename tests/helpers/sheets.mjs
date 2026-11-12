import vm from 'node:vm';import fs from 'node:fs';
export function storage(){
 const properties={DATABASE_ID:'existing-database'},grids={};let seq=0;
 const c=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperties:()=>({...properties}),getProperty:k=>properties[k]||null,setProperty:(k,v)=>properties[k]=v})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},Utilities:{getUuid:()=>`uuid-${++seq}`}});
 for(const file of ['Database.gs','API.gs','Security.gs'])vm.runInContext(fs.readFileSync(new URL('../../'+file,import.meta.url),'utf8'),c);
 vm.runInContext('globalThis.schema=SCHEMA',c);
 for(const [name,cols]of Object.entries(c.schema))grids[name]=[Array.from(cols)];
 const sheet=name=>({getLastRow:()=>grids[name].length,getRange:(row,col,nr,nc)=>({getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>grids[name][row+i-1]?.[col+j-1]??'')),setValues:values=>values.forEach((r,i)=>r.forEach((v,j)=>{(grids[name][row+i-1]||=[])[col+j-1]=typeof v==='string'&&v.startsWith("'")?v.slice(1):v}))}),appendRow:r=>grids[name].push(r.map(v=>typeof v==='string'&&v.startsWith("'")?v.slice(1):v))});
 c.database_=()=>({getSheetByName:sheet});c.now_=()=> '2026-11-12T10:00:00Z';c.today_=()=> '2026-11-12';
 return {c,properties,grids};
}
