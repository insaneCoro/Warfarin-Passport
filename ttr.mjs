import {addDays} from './date-utils.mjs';
const DAY=86400000;
function day(iso){addDays(iso,0);return Date.parse(iso+'T00:00:00Z')/DAY;}
export function sixMonthsBefore(iso){const d=new Date(day(iso)*DAY),n=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-6);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(n,last));return d.toISOString().slice(0,10);}
/** Time-weighted linear interpolation; no extrapolation or invented measurements. */
export function calculateTTR(results,{low,high,asOf,months=6,maxGapDays=56,startDate=null}={}){
 const empty=reason=>({percent:null,observedDays:0,inRangeDays:0,coverage:0,excludedGaps:0,provisional:true,reason});
 if(!(Number(low)>0&&Number(high)>Number(low)))return empty('Target INR is missing');
 if(months!==6)throw Error('Only the documented six-month window is supported');
 const end=day(asOf),windowStart=day(sixMonthsBefore(asOf));let start=windowStart;
 if(startDate){start=Math.max(start,day(addDays(startDate,42)));if(start>=end)return empty('Initial six weeks excluded; maintenance history not available');}
 const seen=new Map();let invalid=0;
 for(const r of results||[]){let when;try{when=day(r.date)}catch{invalid++;continue;}const value=Number(r.value);if(!Number.isFinite(value)||value<=0||value>20){invalid++;continue;}if(when>end)continue;
  if(seen.has(when)&&seen.get(when)!==value)return empty('Conflicting same-day INR results need review');
  if(r.targetLow!==undefined&&r.targetLow!==''&&(Number(r.targetLow)!==Number(low)||Number(r.targetHigh)!==Number(high)))return empty('Historical target changed; target periods need clinical review');
  seen.set(when,value);
 }
 const points=[...seen].sort((a,b)=>a[0]-b[0]);let observed=0,inRange=0,excludedGaps=0;
 for(let i=1;i<points.length;i++){
  const [a,va]=points[i-1],[b,vb]=points[i];if(b<=start||a>=end)continue;
  if(b-a>maxGapDays){excludedGaps++;continue;}
  const from=Math.max(a,start),to=Math.min(b,end);if(to<=from)continue;observed+=to-from;
  if(va===vb){if(va>=low&&va<=high)inRange+=to-from;continue;}
  const x=a+(Number(low)-va)/(vb-va)*(b-a),y=a+(Number(high)-va)/(vb-va)*(b-a);
  inRange+=Math.max(0,Math.min(to,Math.max(x,y))-Math.max(from,Math.min(x,y)));
 }
 if(!observed)return {...empty('At least two usable INR results within the permitted gap are needed'),excludedGaps};
 const windowDays=end-windowStart,coverage=Math.min(100,observed/windowDays*100);
 const earliest=points[0][0],latest=points.at(-1)[0];
 return {percent:Math.round(inRange/observed*1000)/10,observedDays:observed,inRangeDays:inRange,coverage:Math.round(coverage),excludedGaps,invalidResults:invalid,windowStart:new Date(windowStart*DAY).toISOString().slice(0,10),windowEnd:asOf,provisional:!startDate||earliest>windowStart||latest<end-56||coverage<80,reason:!startDate?'Warfarin start date unknown; initiation exclusion cannot be verified':coverage<80?'Limited maintenance coverage':'',method:'Rosendaal linear interpolation',maxGapDays};
}
export function ttrForPatient(p,today){return calculateTTR(p.results,{low:p.targetLow,high:p.targetHigh,asOf:today,startDate:p.warfarinStartDate||null});}
export function clinicTTR(patients,today){const all=patients.map(p=>({patient:p,...ttrForPatient(p,today)})),eligible=all.filter(t=>t.percent!==null&&!t.provisional);return {all,eligible,mean:eligible.length?Math.round(eligible.reduce((s,t)=>s+t.percent,0)/eligible.length*10)/10:null,provisional:all.filter(t=>t.percent!==null&&t.provisional).length};}
