import {addDays} from './date-utils.mjs';
export const UW_SOURCE='https://sites.uw.edu/anticoag/drugs/warfarin/';
export const ACF_SOURCE='https://acforum-excellence.org/Resource-Center/resource_files/-2021-02-10-125746.pdf';
/** UW simplified maintenance reference; never returns a prescription or changes a schedule. */
export function doseReview({inr,low,high,weekly,testDate,today,bleeding='unknown',missed='unknown',interactions='unknown',illness='unknown',recentChange='unknown',mechanicalValve=false}){
 const base={source:UW_SOURCE,sourceVersion:'Reviewed 2026-11-12',status:'review',percentRange:null,weeklyRange:null,midpoint:null,hold:'Requires clinician assessment',recheck:'Individualize after clinical review',messages:[]};
 const result=(status,title,message)=>({...base,status,title,messages:[message]});
 if(bleeding==='yes')return result('urgent','Emergency assessment','Bleeding or suspected thrombosis/head injury: follow the emergency pathway regardless of INR. Do not use this nomogram.');
 if(!Number.isFinite(Number(inr))||Number(inr)<=0||Number(inr)>20)return result('review','Enter an INR result','A current measured result is required.');
 inr=Number(inr);low=Number(low);high=Number(high);weekly=Number(weekly);
 if(inr>=10)return result('urgent','Urgent high-INR assessment','Arrange immediate clinician review under the local critical-INR protocol; symptoms or major bleeding require emergency care.');
 const supported=low===2&&high===3||low===2.5&&high===3.5;
 if(inr>=4.5||supported&&inr>(low===2?4:4.5))return result('urgent','High INR — prompt clinician review','Do not wait for routine recall. Assess bleeding and the need for holding/reversal under the local protocol; no vitamin K dose is generated.');
 if(!supported)return result('review','Individual target needs specialist review','This reference supports targets 2–3 and 2.5–3.5 only. Do not apply a shifted nomogram to another target.');
 if(inr<1.5||mechanicalValve&&inr<low)return result('urgent','Low INR — assess thrombotic risk','Prompt clinician assessment is required, particularly with a mechanical valve. Bridging is a separate clinical decision, never generated here.');
 try{addDays(testDate,0);if(testDate>today||testDate<addDays(today,-7))return result('review','Review a current result','This INR is future-dated or more than seven days old. Enter a current clinical review before using reference dose ranges.');}catch{return result('review','Check the test date','A valid INR test date is required.');}
 if([bleeding,missed,interactions,illness,recentChange].some(v=>v==='unknown'))return result('review','Confirm the clinical context','Assess bleeding, missed doses, medicines/diet, illness and recent dose changes below to view the reference range.');
 if([missed,interactions,illness,recentChange].some(v=>v==='yes'))return result('review','Clinical factors change the interpretation','Transient causes or a recent dose change may make a routine adjustment inappropriate. Review these factors with the clinician first.');
 if(!Number.isFinite(weekly)||weekly<=0)return result('review','Previous weekly dose is unknown','A verified maintenance regimen is needed; this reference is not for treatment initiation.');
 let range=[0,0],hold='No hold suggested by this maintenance band',recheck='Stable patients: reference interval 4–8 weeks; clinician individualizes';
 if(inr<low){range=[5,15];hold='A one-time reload is a clinician-only decision; none is calculated here';recheck='After a dose change: reference interval 1–2 weeks';}
 else if(inr>high){if(inr<=(low===2?3.5:4)){range=[-15,0];hold='Review whether a hold is needed';}else{range=[-15,-5];hold='Reference: consider holding 0–1 dose; clinician must specify';}recheck='If a dose is held for significant over-anticoagulation: 1–2 days; otherwise after a change: 1–2 weeks';}
 const target=range.map(change=>Math.round(weekly*(1+change/100)*100)/100),midpoint=Math.round(weekly*(1+(range[0]+range[1])/200)*100)/100;
 return {...base,status:inr<low?'low':inr>high?'high':'in-range',title:inr<low?'Below target':inr>high?'Above target':'Within target',percentRange:range,weeklyRange:target,midpoint,hold,recheck,messages:['Reference range, not an approved decision. Keep the original schedule until an authorized clinician enters and approves the plan.']};
}
