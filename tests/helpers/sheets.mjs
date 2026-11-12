import vm from 'node:vm';import fs from 'node:fs';
export function storage(){
 const properties={DATABASE_ID:'existing-database'},grids={};let seq=0;
 const c=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperties:()=>({...properties}),getProperty:k=>properties[k]||null,setProperty:(k,v)=>properties[k]=v})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},Utilities:{getUuid:()=>`uuid-${++seq}`,formatDate}});
 for(const file of ['Database.gs','API.gs','Security.gs'])vm.runInContext(fs.readFileSync(new URL('../../'+file,import.meta.url),'utf8'),c);
 vm.runInContext('globalThis.schema=SCHEMA',c);
 for(const [name,cols]of Object.entries(c.schema))grids[name]=[Array.from(cols)];
 const sheet=name=>({getLastRow:()=>grids[name].length,getRange:(row,col,nr,nc)=>({getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>grids[name][row+i-1]?.[col+j-1]??'')),setValues:values=>values.forEach((r,i)=>r.forEach((v,j)=>{(grids[name][row+i-1]||=[])[col+j-1]=asSheets(v)}))}),appendRow:r=>grids[name].push(r.map(asSheets))});
 c.database_=()=>({getSheetByName:sheet,getSpreadsheetTimeZone:()=>'Asia/Riyadh'});c.now_=()=> '2026-11-12T10:00:00Z';c.today_=()=> '2026-11-12';
 return {c,properties,grids};
}

// Like Google Sheets: a leading apostrophe keeps text as-is; plain yyyy-MM-dd text becomes a date cell,
// which getValues() returns as a Date at midnight in the spreadsheet time zone (Asia/Riyadh, UTC+3).
function asSheets(v){if(typeof v!=='string')return v;if(v.startsWith("'"))return v.slice(1);if(/^\d{4}-\d{2}-\d{2}$/.test(v))return new Date(v+'T00:00:00+03:00');return v;}
// Minimal Utilities.formatDate for the patterns the backend uses (UTC and Asia/Riyadh only).
export function formatDate(date,zone,pattern){const offset=zone==='Asia/Riyadh'?180:0,d=new Date(date.getTime()+offset*60000),p=n=>String(n).padStart(2,'0');return pattern.replace("'T'",'T').replace('yyyy',d.getUTCFullYear()).replace('MM',p(d.getUTCMonth()+1)).replace('dd',p(d.getUTCDate())).replace('HH',p(d.getUTCHours())).replace('mm',p(d.getUTCMinutes())).replace('ss',p(d.getUTCSeconds())).replace('XXX',offset?'+03:00':'Z');}
