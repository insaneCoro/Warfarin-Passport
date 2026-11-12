/** CRUD operations on Google Sheets. User identity is verified via signed gateway assertion. */
function busyError_(){const error=Error('Clinic is busy saving another request. Please wait a moment and retry.');error.code='SERVER_BUSY';return error;}
function withLock_(fn){const lock=LockService.getScriptLock();let acquired=false;try{acquired=lock.tryLock(5000);}catch{throw busyError_();}if(!acquired)throw busyError_();try{return fn()}finally{lock.releaseLock()}}
function patientView_(p){const o={...p};delete o.__row;return o}
function riskSnapshot_(p){return {riskLevel:p.riskLevel||'routine',riskCategory:p.riskCategory||'',riskReason:p.riskReason||'',riskReviewDate:p.riskReviewDate||''};}
function riskInput_(p,existing={}){
 const riskLevel=clean_(p.riskLevel??existing.riskLevel??'routine',20);
 if(!['routine','high'].includes(riskLevel))throw Error('Select routine or high risk');
 if(riskLevel==='routine')return {riskLevel,riskCategory:'',riskReason:'',riskReviewDate:''};
 const riskCategory=clean_(p.riskCategory??existing.riskCategory,30),riskReason=clean_(p.riskReason??existing.riskReason,1000),riskReviewDate=clean_(p.riskReviewDate??existing.riskReviewDate,10);
 if(!['bleeding','thrombosis','both','other'].includes(riskCategory))throw Error('Choose the high-risk category');
 if(!riskReason)throw Error('Document why this patient is high risk');
 if(riskReviewDate)requireDate_(riskReviewDate);
 return {riskLevel,riskCategory,riskReason,riskReviewDate};
}
function patientInput_(x,existing){
 const mrn=clean_(x.mrn??existing?.mrn,80).toUpperCase(),name=clean_(x.name??existing?.name,180),dob=clean_(x.dob??existing?.dob,10),diagnosis=clean_(x.diagnosis??existing?.diagnosis,350);
 if(!mrn.startsWith('DEMO-'))throw Error('Synthetic DEMO- identifiers only');
 if(!mrn||!name||!dob||!diagnosis)throw Error('MRN, name, DOB, and diagnosis are required');
 requireDate_(dob);if(dob>today_())throw Error('DOB cannot be in the future');
 const low=numericOrBlank_(x.targetLow??existing?.targetLow),high=numericOrBlank_(x.targetHigh??existing?.targetHigh);
 if((low==='')!==(high==='')||(low!==''&&(low<=0||high<=low||high>20)))throw Error('Invalid individualized INR target range');
 const enroll=clean_(x.enrollmentDate??existing?.enrollmentDate,10);
 if(enroll)requireDate_(enroll);
 const enInr=numericOrBlank_(x.enrollmentInr??existing?.enrollmentInr);
 if(enInr!==''&&(enInr<=0||enInr>20))throw Error('Invalid enrollment INR');
 const warfarinStartDate=clean_(x.warfarinStartDate??existing?.warfarinStartDate,10);if(warfarinStartDate){requireDate_(warfarinStartDate);if(warfarinStartDate>today_())throw Error('Warfarin start date cannot be in the future');}
 return {...riskInput_(x,existing),mrn,name,dob,diagnosis,warfarinStartDate,phone:clean_(x.phone??existing?.phone,40),caregiver:clean_(x.caregiver??existing?.caregiver,120),caregiverPhone:clean_(x.caregiverPhone??existing?.caregiverPhone,40),targetLow:low,targetHigh:high,enrollmentDate:enroll,enrollmentInr:enInr};
}
function patientsList_(p,user){const q=clean_(p.query,150).toLowerCase();return allRows_('Patients').filter(v=>!['Archived','Importing'].includes(v.status)&&(!q||[v.mrn,v.name,v.phone].some(s=>String(s).toLowerCase().includes(q)))).slice(0,200).map(v=>({id:v.id,mrn:v.mrn,name:v.name,dob:v.dob,diagnosis:v.diagnosis,targetLow:v.targetLow,targetHigh:v.targetHigh,status:v.status,...riskSnapshot_(v)}));}
function patientGet_(p,user){const record=requirePatient_(clean_(p.patientId,80)),id=record.id;return {approvals:allRows_('Audit_Log').filter(v=>v.action==='decision.approve'&&allRows_('Encounters').some(e=>e.id===v.recordId&&e.patientId===id)).map(patientView_),patient:patientView_(record),results:allRows_('INR_Results').filter(v=>v.patientId===id&&allRows_('Encounters').some(e=>e.id===v.encounterId&&e.status==='Complete')).map(patientView_),encounters:allRows_('Encounters').filter(v=>v.patientId===id&&v.status==='Complete').map(patientView_),dosePlans:allRows_('Dose_Plans').filter(v=>v.patientId===id&&allRows_('Encounters').some(e=>e.id===v.encounterId&&e.status==='Complete')).map(patientView_),followups:allRows_('Follow_Ups').filter(v=>v.patientId===id).map(patientView_),attempts:allRows_('Followup_Attempts').filter(v=>v.patientId===id).map(patientView_),inventory:allRows_('Inventory').filter(v=>v.patientId===id).map(patientView_),notes:allRows_('Clinical_Notes').filter(v=>v.patientId===id).map(patientView_)};}
function patientCreate_(p,user){return withLock_(()=>{assertWorkspace_(p);const data=patientInput_(p);if(allRows_('Patients').some(x=>String(x.mrn).toUpperCase()===data.mrn))throw Error('MRN already exists');const id=Utilities.getUuid();append_('Patients',{...data,id,status:'Active',createdAt:now_(),updatedAt:now_(),createdBy:user.uid,rowVersion:1,riskUpdatedAt:data.riskLevel==='high'?now_():'',riskUpdatedBy:data.riskLevel==='high'?user.uid:''});if(data.riskLevel==='high')audit_(user,'patient.risk.update','Patients',id,{before:null,after:riskSnapshot_(data)});audit_(user,'patient.create','Patients',id,'New patient registered');return {id,mrn:data.mrn}})}
function patientUpdate_(p,user){return withLock_(()=>{assertWorkspace_(p);
 const id=clean_(p.patientId,80),old=requirePatient_(id);
 if(Number(p.expectedVersion)!==Number(old.rowVersion))throw Error('Record changed by another user. Reload before editing.');
 const data=patientInput_(p,old);
 if(data.mrn!==String(old.mrn).toUpperCase()&&allRows_('Patients').some(x=>x.id!==id&&String(x.mrn).toUpperCase()===data.mrn))throw Error('MRN already exists');
 const riskChanged=JSON.stringify(riskSnapshot_(old))!==JSON.stringify(riskSnapshot_(data));
 if(riskChanged)audit_(user,'patient.risk.request','Patients',id,{before:riskSnapshot_(old),after:riskSnapshot_(data)});
 replace_('Patients',{...old,...data,updatedAt:now_(),rowVersion:Number(old.rowVersion)+1,riskUpdatedAt:riskChanged?now_():old.riskUpdatedAt||'',riskUpdatedBy:riskChanged?user.uid:old.riskUpdatedBy||''});
 if(riskChanged)audit_(user,'patient.risk.update','Patients',id,{before:riskSnapshot_(old),after:riskSnapshot_(data)});
 audit_(user,'patient.update','Patients',id,{before:patientView_(old),after:data});
 return {id,rowVersion:Number(old.rowVersion)+1};
})}
function encounterCreate_(p,user){return withLock_(()=>{assertWorkspace_(p);
 const patient=requirePatient_(clean_(p.patientId,80));const key=clean_(p.requestId,100);if(!/^[a-z0-9-]{16,100}$/i.test(key))throw Error('Missing idempotency request ID');
 const existing=findRow_('Encounters','requestId',key);if(existing){if(existing.patientId!==patient.id||existing.createdBy!==user.uid)throw Error('Request ID collision');if(existing.status!=='Complete')throw Error('Partial save needs administrator reconciliation; do not submit a new request ID');return {id:existing.id,status:existing.status,alreadyExists:true};}
 if(Number(p.expectedVersion)!==Number(patient.rowVersion))throw Error('Record changed; reload before saving');
 const date=requireDate_(clean_(p.testDate,10)),inr=Number(p.inr),next=requireDate_(clean_(p.nextInrDate,10));
 if(!Number.isFinite(inr)||inr<=0||inr>20)throw Error('Invalid INR value');if(next<date)throw Error('Next INR date cannot precede test date');
 const weeklyInput=numericOrBlank_(p.weeklyMg);
 const daily=p.daily;if(!Array.isArray(daily)||daily.length!==7||daily.some(v=>!Number.isFinite(Number(v))||Number(v)<0||Number(v)>100))throw Error('Seven validated daily doses are required');
 const reason=clean_(p.reason,2000);if(!reason)throw Error('Reason for dose decision required');
 const previous=allRows_('Dose_Plans').filter(x=>x.patientId===patient.id&&allRows_('Encounters').some(e=>e.id===x.encounterId&&e.status==='Complete')).at(-1);
 const previousDaily=previous?['sun','mon','tue','wed','thu','fri','sat'].map(k=>Number(previous[k])):null,previousWeekly=previousDaily?previousDaily.reduce((a,b)=>a+b,0):null;
 if(weeklyInput!==''&&Math.abs(daily.reduce((s,v)=>s+Number(v),0)-weeklyInput)>0.01)throw Error('Daily doses must match the entered weekly dose');
 const id=Utilities.getUuid(),stamp=now_(),callDate=plusCalendarDays_(next,2),doseDaily=daily.map(Number);
 // Sheets do not provide multi-sheet ACID transactions: keep a Pending encounter
 // until all linked records have been written; failed partial saves need reconciliation.
 append_('Encounters',{id,requestId:key,patientId:patient.id,testDate:date,inr,note:clean_(p.note,4000),nextInrDate:next,status:'Pending',createdAt:stamp,createdBy:user.uid,holdInstruction:clean_(p.holdInstruction,1000),patientInstructions:clean_(p.patientInstructions,2000),reviewFactors:clean_(p.reviewFactors,2000)});
 append_('INR_Results',{id:Utilities.getUuid(),patientId:patient.id,testDate:date,inr,enteredAt:stamp,enteredBy:user.uid,encounterId:id,targetLow:patient.targetLow,targetHigh:patient.targetHigh});
 append_('Dose_Plans',{id:Utilities.getUuid(),patientId:patient.id,encounterId:id,effectiveDate:date,sun:doseDaily[0],mon:doseDaily[1],tue:doseDaily[2],wed:doseDaily[3],thu:doseDaily[4],fri:doseDaily[5],sat:doseDaily[6],weeklyMg:doseDaily.reduce((a,b)=>a+b,0),previousDaily:previousDaily?JSON.stringify(previousDaily):'',previousWeeklyMg:previousWeekly??'',percentChange:previousWeekly>0?(doseDaily.reduce((a,b)=>a+b,0)-previousWeekly)/previousWeekly*100:'',inr,reason,nextInrDate:next,approvedBy:'',approvedAt:'',createdAt:stamp,createdBy:user.uid});
 append_('Follow_Ups',{id:Utilities.getUuid(),patientId:patient.id,encounterId:id,inrCheckDate:next,callDueDate:callDate,status:'Pending',createdAt:stamp});
 if(clean_(p.note))append_('Clinical_Notes',{id:Utilities.getUuid(),patientId:patient.id,encounterId:id,noteDate:date,text:clean_(p.note,4000),createdAt:stamp,createdBy:user.uid});
 audit_(user,'inr.enter','Encounters',id,{before:null,after:{inr,testDate:date}});
 audit_(user,'dose.change','Encounters',id,{before:previousDaily,after:doseDaily,reason,holdInstruction:clean_(p.holdInstruction,1000),patientInstructions:clean_(p.patientInstructions,2000),reviewFactors:clean_(p.reviewFactors,2000)});
 if(clean_(p.note))audit_(user,'note.create','Encounters',id,{before:null,after:clean_(p.note,4000)});
 const rec=findRow_('Encounters','id',id);rec.status='Complete';replace_('Encounters',rec);
 replace_('Patients',{...patient,rowVersion:Number(patient.rowVersion)+1,updatedAt:stamp});
 return {id,inr,callDueDate:callDate,weeklyMg:doseDaily.reduce((a,b)=>a+b,0)};
})}
function followupList_(p,user){const pending=allRows_('Follow_Ups').filter(x=>x.status!=='Completed'&&allRows_('Encounters').some(e=>e.id===x.encounterId&&e.status==='Complete'));const people=Object.fromEntries(allRows_('Patients').map(x=>[x.id,{mrn:x.mrn,name:x.name}]));return pending.filter(x=>people[x.patientId]).map(x=>({...patientView_(x),patient:people[x.patientId]||null})).sort((a,b)=>String(a.callDueDate).localeCompare(String(b.callDueDate))).slice(0,250)}
function followupComplete_(p,user){return followupRecord_({...p,complete:true},user)}
function followupRecord_(p,user){return withLock_(()=>{assertWorkspace_(p);
 const f=findRow_('Follow_Ups','id',clean_(p.followupId,80));if(!f)throw Error('Follow-up not found');requirePatient_(f.patientId);
 const key=clean_(p.requestId,100);if(!/^[a-z0-9-]{16,100}$/i.test(key))throw Error('Request ID required');
 const duplicate=findRow_('Followup_Attempts','requestId',key);if(duplicate){if(duplicate.followupId!==f.id||duplicate.createdBy!==user.uid)throw Error('Request ID collision');return {id:duplicate.id,status:f.status};}
 if(f.status==='Completed')throw Error('Already completed');
 if(f.encounterId&&!allRows_('Encounters').some(e=>e.id===f.encounterId&&e.status==='Complete'))throw Error('Encounter needs reconciliation');
 const outcome=clean_(p.outcome,80),actions=clean_(p.actions,4000),note=clean_(p.note,4000);
 if(!['Contacted','No answer','Unable to contact','Escalated'].includes(outcome)||!actions)throw Error('Outcome and actions required');
 if(p.complete===true&&!['Contacted','Escalated'].includes(outcome))throw Error('Failed contact must remain pending');
 const encounterId=clean_(p.encounterId,80);
 if(encounterId&&!allRows_('Encounters').some(e=>e.id===encounterId&&e.patientId===f.patientId&&e.status==='Complete'))throw Error('Saved encounter required');
 const id=Utilities.getUuid(),stamp=now_();
 append_('Followup_Attempts',{id,requestId:key,followupId:f.id,patientId:f.patientId,outcome,actions,note,encounterId,completed:p.complete===true,createdAt:stamp,createdBy:user.uid});
 audit_(user,'followup.attempt','Follow_Ups',f.id,{before:{status:f.status},after:{outcome,actions,note,encounterId,complete:p.complete===true}});
 if(p.complete===true){audit_(user,'followup.complete','Follow_Ups',f.id,{before:{status:f.status},after:{status:'Completed',attemptId:id}});replace_('Follow_Ups',{...f,status:'Completed',completedAt:stamp,completedBy:user.uid,outcome});}
 return {id,status:p.complete===true?'Completed':'Pending'};
})}
function decisionApprove_(p,user){return withLock_(()=>{assertWorkspace_(p);
 if(user.role!=='clinician')throw Error('Authenticated clinician role required');
 const encounter=findRow_('Encounters','id',clean_(p.encounterId,80));if(!encounter||encounter.status!=='Complete')throw Error('Completed encounter required');requirePatient_(encounter.patientId);
 const prior=allRows_('Audit_Log').find(a=>a.action==='decision.approve'&&a.recordId===encounter.id);
 if(prior)return {id:encounter.id,alreadyApproved:true};
 audit_(user,'decision.approve','Encounters',encounter.id,{before:{approved:false},after:{approved:true,approvedBy:user.uid,approvedAt:now_()}});
 return {id:encounter.id};
})}
function inventorySet_(p,user){return withLock_(()=>{assertWorkspace_(p);const patient=requirePatient_(clean_(p.patientId,80)),strength=Number(p.strengthMg),qty=Number(p.quantity),date=requireDate_(clean_(p.confirmedDate,10));if(!Number.isFinite(strength)||strength<=0||strength>20||!Number.isInteger(qty)||qty<0)throw Error('Invalid stock count or strength');const existing=allRows_('Inventory').find(x=>x.patientId===patient.id&&Number(x.strengthMg)===strength),old=existing?Number(existing.quantity):0,id=existing?existing.id:Utilities.getUuid();const record={id,patientId:patient.id,strengthMg:strength,quantity:qty,confirmedDate:date,updatedAt:now_(),updatedBy:user.uid};existing?replace_('Inventory',{...existing,...record}):append_('Inventory',record);append_('Inventory_Log',{id:Utilities.getUuid(),patientId:patient.id,strengthMg:strength,oldQuantity:old,newQuantity:qty,confirmedDate:date,actorUid:user.uid,createdAt:now_()});audit_(user,'inventory.set','Inventory',id,'Confirmed tablet count updated');return{id,quantity:qty}})}
function noteCreate_(p,user){return withLock_(()=>{assertWorkspace_(p);const patient=requirePatient_(clean_(p.patientId,80)),text=clean_(p.text,4000),date=requireDate_(clean_(p.noteDate,10));if(!text)throw Error('Clinical note cannot be empty');const supersedes=clean_(p.supersedes,80),previous=supersedes?findRow_('Clinical_Notes','id',supersedes):null;if(supersedes&&(!previous||previous.patientId!==patient.id))throw Error('Prior note not found');const id=Utilities.getUuid();append_('Clinical_Notes',{id,patientId:patient.id,encounterId:'',noteDate:date,text,supersedes,createdAt:now_(),createdBy:user.uid});audit_(user,supersedes?'note.amend':'note.create','Clinical_Notes',id,{before:previous?.text||null,after:text,supersedes});return{id}})}
function userUpsert_(p,user){requireAdmin_(user);return withLock_(()=>{assertWorkspace_(p);let uid=clean_(p.uid,128);const email=clean_(p.email,160).toLowerCase(),role=clean_(p.role,20),name=clean_(p.displayName,120);if(!email||!['admin','subadmin','clinician'].includes(role))throw Error('Invalid staff user');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name)throw Error('Valid staff email and name required');if(!uid){const matches=allRows_('Users').filter(u=>String(u.email).toLowerCase()===email);if(matches.length)throw Error('Email already exists. Edit the existing staff member.');uid='invite:'+Utilities.getUuid();}else if(!findRow_('Users','firebaseUid',uid))throw Error('Staff record not found');if(allRows_('Users').some(u=>u.firebaseUid!==uid&&String(u.email).toLowerCase()===email))throw Error('Email already exists');if(uid===user.uid&&(role!=='admin'||p.active===false))throw Error('You cannot remove your own administrator access');const existing=findRow_('Users','firebaseUid',uid);if(existing?.role==='admin'&&String(existing.active).toLowerCase()==='true'&&(role!=='admin'||p.active===false)&&allRows_('Users').filter(u=>u.role==='admin'&&String(u.active).toLowerCase()==='true').length<2)throw Error('Keep at least one active administrator');const record={firebaseUid:uid,email,role,active:p.active===false?'false':'true',displayName:name,createdAt:existing?.createdAt||now_(),updatedAt:now_()};if(existing&&!uid.startsWith('invite:')&&String(existing.email).toLowerCase()!==email)throw Error('Existing account email cannot be changed here');existing?replace_('Users',{...existing,...record}):append_('Users',record);audit_(user,'users.upsert','Users',uid,JSON.stringify({before:existing?{email:existing.email,role:existing.role,active:existing.active,displayName:existing.displayName}:null,after:record}));return{uid,role}})}

/** Fixed fictional fixtures only. Never import arbitrary browser/localStorage data. */
function demoSeed_(p,user){
 requireAdmin_(user);
 if(workspaceState_().mode!=='development')throw Error('Fictional initialization is disabled after reset');
 if(p.confirmSynthetic!==true)throw Error('Confirm synthetic test records');
 return withLock_(()=>{assertWorkspace_(p);
  // Validate every tab before any writes. Existing database is never recreated.
  Object.keys(SCHEMA).forEach(tab_);
  const snapshot=Object.fromEntries(Object.keys(SCHEMA).map(name=>[name,[...allRows_(name)]]));
  const insert=(name,record,action)=>fixtureInsert_(name,record,action,user,snapshot);
  const profiles=[
   [1,74,'Atrial fibrillation',[2,3],[2.2,2.6,3.2,2.9,2.5,2.6],[5,5,5,5,5,5,5],-2,14],
   [2,67,'Mechanical mitral valve',[2.5,3.5],[3.0,3.2,2.3,2.9,3.8,3.4],[5,5,7.5,5,5,7.5,5],1,8],
   [3,82,'Venous thromboembolism',[2,3],[2.1,1.9,2.4,2.2,2.1,1.8],[3,3,3,3,3,3,3],-5,12],
   [4,78,'Atrial fibrillation',[2,3],[2.4,2.9,2.8,2.3,2.6,2.5],[4,4,4,4,4,4,4],4,29],
   ...additionalDemoProfiles_().map(c=>[c.n,c.age,c.diagnosis,c.target,c.inrs,c.daily,c.nextOffset,c.stock,c])
  ];
  const unfinished=profiles.filter(([n])=>{const id='synthetic-fixture-v1-p'+n,mrn='DEMO-'+String(n).padStart(3,'0'),patient=snapshot.Patients.find(x=>x.id===id);return !snapshot.Patients.some(x=>String(x.mrn).toUpperCase()===mrn&&x.id!==id)&&(!patient||patient.status==='Importing');});
  const result={created:[],skipped:profiles.filter(p=>!unfinished.includes(p)).map(([n])=>'DEMO-'+String(n).padStart(3,'0')),remaining:unfinished.length,total:profiles.length};
  unfinished.slice(0,1).forEach(([n,age,diagnosis,target,inrs,daily,nextOffset,stock,meta={}])=>{
   const id='synthetic-fixture-v1-p'+n,mrn='DEMO-'+String(n).padStart(3,'0'),encounterId=id+'-encounter';
   let patient=snapshot.Patients.find(x=>x.id===id);
   const collision=snapshot.Patients.find(x=>String(x.mrn).toUpperCase()===mrn&&x.id!==id);
   // Completed/edited/archived samples and MRN collisions are always preserved.
   if(collision||(patient&&patient.status!=='Importing')){result.skipped.push(mrn);return;}
   const anchor=patient?plusCalendarDays_(String(patient.enrollmentDate),75):today_(),stamp=now_();
   const baseline=plusCalendarDays_(anchor,meta.historyOffsets?.at(-1)??-7),effective=plusCalendarDays_(anchor,meta.regimenOffset??-7),next=plusCalendarDays_(anchor,nextOffset);
   const label='Synthetic sample fixture v1. Fictional history for development only; not a clinical prescription or approval.';
   if(!patient){
    patient={id,mrn,name:'Sample Patient '+String.fromCharCode(64+n),dob:(Number(anchor.slice(0,4))-age)+'-01-15',phone:'050000000'+n,caregiver:'Demo caregiver',caregiverPhone:'050111000'+n,diagnosis,targetLow:target[0],targetHigh:target[1],enrollmentDate:plusCalendarDays_(anchor,-75),enrollmentInr:inrs[0],status:'Importing',createdAt:stamp,updatedAt:stamp,createdBy:user.uid,rowVersion:1,warfarinStartDate:meta.warfarinStartOffset?plusCalendarDays_(anchor,meta.warfarinStartOffset):'',riskLevel:meta.riskLevel||'routine',riskCategory:meta.riskCategory||'',riskReason:meta.riskReason||'',riskReviewDate:meta.riskLevel==='high'?anchor:'',riskUpdatedBy:meta.riskLevel==='high'?user.uid:'',riskUpdatedAt:meta.riskLevel==='high'?stamp:''};
    insert('Patients',patient,'patient.create');
   }
   insert('Encounters',{id:encounterId,requestId:encounterId,patientId:id,testDate:baseline,inr:inrs.at(-1),note:label,nextInrDate:next,status:'Pending',createdAt:stamp,createdBy:user.uid},'demo.encounter.import');
   // Historical tests belong to this explicitly labelled fixture-import encounter.
   inrs.forEach((inr,i)=>insert('INR_Results',{id:id+'-inr-'+i,patientId:id,testDate:plusCalendarDays_(anchor,meta.historyOffsets?.[i]??(-42+i*7)),inr,enteredAt:stamp,enteredBy:user.uid,encounterId,targetLow:target[0],targetHigh:target[1]},'inr.enter'));
   insert('Dose_Plans',{id:id+'-dose',patientId:id,encounterId,effectiveDate:effective,...Object.fromEntries(['sun','mon','tue','wed','thu','fri','sat'].map((day,i)=>[day,daily[i]])),weeklyMg:daily.reduce((a,b)=>a+b,0),previousDaily:'',previousWeeklyMg:'',percentChange:'',inr:inrs.at(-1),reason:label,nextInrDate:next,approvedBy:'',approvedAt:'',createdAt:stamp,createdBy:user.uid},'dose.change');
   insert('Follow_Ups',{id:id+'-followup',patientId:id,encounterId,inrCheckDate:next,callDueDate:plusCalendarDays_(next,2),status:'Pending',createdAt:stamp},'followup.schedule');
   insert('Inventory',{id:id+'-stock',patientId:id,strengthMg:5,quantity:stock,confirmedDate:plusCalendarDays_(anchor,-10),updatedAt:stamp,updatedBy:user.uid},'demo.inventory.import');
   insert('Clinical_Notes',{id:id+'-note',patientId:id,encounterId,noteDate:baseline,text:label+(meta.riskReason?' '+meta.riskReason:''),createdAt:stamp,createdBy:user.uid,supersedes:''},'note.create');
   audit_(user,'demo.import.complete','Patients',id,{synthetic:true,source:'fixture-v1',before:{status:'Importing'},after:{status:'Active'}});
   const encounter=findRow_('Encounters','id',encounterId);
   if(encounter.status!=='Complete')replace_('Encounters',{...encounter,status:'Complete'});
   replace_('Patients',{...findRow_('Patients','id',id),status:'Active',updatedAt:stamp});
   result.created.push(mrn);result.remaining--;
  });
  return result;
 });
}
function fixtureInsert_(name,record,action,user,snapshot){
 const prior=snapshot[name].find(x=>x.id===record.id);
 if(prior&&record.patientId&&prior.patientId!==record.patientId)throw Error('Synthetic fixture ID collision');
 if(!prior){append_(name,record);snapshot[name].push(record);}
 const audited=snapshot.Audit_Log.some(a=>a.recordType===name&&a.recordId===record.id&&(a.action===action||a.action==='demo.import.reconcile'));
 if(!audited){audit_(user,prior?'demo.import.reconcile':action,name,record.id,{synthetic:true,source:'fixture-v1',before:null,after:patientView_(prior||record),entryActor:(prior||record).enteredBy||(prior||record).createdBy||(prior||record).updatedBy||null});snapshot.Audit_Log.push({recordType:name,recordId:record.id,action:prior?'demo.import.reconcile':action});}
}

/** Shared clinic messages: approved staff only (dispatch authorizes every call). */
function messagesList_(p,user){
 let rows=[...allRows_('Team_Messages')].reverse();
 if(p.patientId){requirePatient_(clean_(p.patientId,80));rows=rows.filter(m=>m.patientId===p.patientId);}
 if(p.beforeId){const index=rows.findIndex(m=>m.id===p.beforeId);if(index<0)throw Error('Message cursor not found');rows=rows.slice(index+1);}
 const limit=50,selected=rows.slice(0,limit);
 return {messages:selected.map(patientView_),hasMore:rows.length>limit,nextBeforeId:selected.at(-1)?.id||null};
}
function messageCreate_(p,user){return withLock_(()=>{assertWorkspace_(p);
 const requestId=clean_(p.requestId,100),body=String(p.body||'').trim(),replyTo=clean_(p.replyTo,80),patientId=clean_(p.patientId,80);
 if(!/^[a-z0-9-]{16,100}$/i.test(requestId))throw Error('Message request ID required');
 if(!body||body.length>3000)throw Error('Enter a message of 1–3000 characters');
 const existing=findRow_('Team_Messages','requestId',requestId);
 if(existing){
  if(existing.createdBy!==user.uid||existing.body!==body||String(existing.replyTo||'')!==replyTo||String(existing.patientId||'')!==patientId)throw Error('Message request ID collision');
  if(!allRows_('Audit_Log').some(a=>a.recordType==='Team_Messages'&&a.recordId===existing.id))audit_(user,'message.audit.reconcile','Team_Messages',existing.id,{after:patientView_(existing)});
  return patientView_(existing);
 }
 if(patientId)requirePatient_(patientId);
 const parent=replyTo?findRow_('Team_Messages','id',replyTo):null;
 if(replyTo&&!parent)throw Error('Reply message not found');
 if(parent&&String(parent.patientId||'')!==patientId)throw Error('Reply must stay in the same patient conversation');
 const id=Utilities.getUuid(),message={id,requestId,threadId:parent?(parent.threadId||parent.id):id,replyTo,patientId,body,createdAt:now_(),createdBy:user.uid,authorName:user.displayName||user.email||user.uid,authorRole:user.role};
 append_('Team_Messages',message);
 audit_(user,'message.create','Team_Messages',id,{before:null,after:message});
 return message;
})}

/** Fixed extended synthetic cases; kept in sync with additional-cases.mjs by tests. */
function additionalDemoProfiles_(){return [
 {n:5,age:76,diagnosis:'Atrial fibrillation',target:[2,3],inrs:[2.4,1.7,3.8,2.6,4.9,2.1,3.3,4.0],daily:[5,5,5,5,5,5,5],nextOffset:1,stock:20,historyOffsets:[-196,-168,-140,-112,-84,-56,-28,0],regimenOffset:-28,warfarinStartOffset:-365,riskLevel:'high',riskCategory:'bleeding',riskReason:'Synthetic case: previous gastrointestinal bleeding and variable INR; clinician review required.'},
 {n:6,age:58,diagnosis:'Mechanical mitral valve',target:[2.5,3.5],inrs:[2.9,3.8,2.1,3.5,4.3,2.8,2.0,1.6],daily:[5,7.5,5,7.5,5,7.5,5],nextOffset:1,stock:6,historyOffsets:[-196,-168,-140,-112,-84,-56,-28,0],regimenOffset:-28,warfarinStartOffset:-365,riskLevel:'high',riskCategory:'thrombosis',riskReason:'Synthetic case: mechanical mitral valve with a subtherapeutic INR; prompt clinician assessment.'},
 {n:7,age:72,diagnosis:'Recurrent venous thromboembolism',target:[2,3],inrs:[2.3,2.8,1.4,3.4,2.0,4.5,3.1,6.2],daily:[2.5,5,2.5,5,2.5,5,2.5],nextOffset:1,stock:18,historyOffsets:[-196,-168,-140,-112,-84,-56,-28,0],regimenOffset:-28,warfarinStartOffset:-365,riskLevel:'high',riskCategory:'both',riskReason:'Synthetic case: recurrent thrombosis history, labile INR and a recent interacting-medicine concern.'}
];}

function workspacePrepare_(p,user){
 requireAdmin_(user);const state=workspaceState_();
 if(state.mode!=='development'||!!state.preparedRelease)return {remaining:0,disabled:state.mode!=='development'};
 const result=demoSeed_({...p,confirmSynthetic:true},user);
 if(!result.remaining)withLock_(()=>{assertWorkspace_(p);const current=workspaceState_();if(current.mode!=='development')return;
  const samples=[{id:'fixture-team-review',patientId:allRows_('Patients').find(p=>p.mrn==='DEMO-007')?.id||'',body:'FICTIONAL HANDOVER: elevated INR in Sample Patient G. Please open the passport and document clinician review. This message is a development example, not a completed escalation.'},{id:'fixture-team-welcome',patientId:'',body:'FICTIONAL DEVELOPMENT WORKSPACE: seven varied patients include stable, labile, bleeding-risk and mechanical-valve cases. Clinical decisions and approvals must be documented separately.'}];
  for(const sample of samples)if(!findRow_('Team_Messages','id',sample.id)){append_('Team_Messages',{...sample,requestId:sample.id,threadId:sample.id,replyTo:'',createdAt:now_(),createdBy:user.uid,authorName:'Fictional handover · imported by '+(user.displayName||user.uid),authorRole:'Synthetic fixture'});audit_(user,'message.fixture.import','Team_Messages',sample.id,{synthetic:true});}
  PropertiesService.getScriptProperties().setProperty('CLINIC_WORKSPACE',JSON.stringify({...current,preparedRelease:CLINIC_RELEASE}));
 });
 return result;
}
function workspaceReset_(p,user){requireAdmin_(user);return withLock_(()=>{
 const state=workspaceState_(),requestId=clean_(p.requestId,100);
 if(state.resetRequestId===requestId&&requestId){if(!allRows_('Audit_Log').some(a=>a.action==='workspace.reset.complete'&&a.recordId===state.id))audit_(user,'workspace.reset.complete','Workspace',state.id,{after:state,reconciled:true,historyRetained:true});return {workspaceId:state.id,alreadyReset:true};}
 assertWorkspace_(p);
 if(p.confirmation!=='RESET DEVELOPMENT DATA'||!p.confirmArchive||!/^[a-z0-9-]{16,100}$/i.test(requestId))throw Error('Type RESET DEVELOPMENT DATA and confirm archival');
 if(state.mode!=='development')throw Error('The development workspace has already been reset');
 const patients=allRows_('Patients');if(patients.some(p=>!String(p.mrn).startsWith('DEMO-')))throw Error('Reset supports fictional development records only');
 const next={id:Utilities.getUuid(),mode:'empty',preparedRelease:CLINIC_RELEASE,resetRequestId:requestId,resetAt:now_(),resetBy:user.uid};
 audit_(user,'workspace.reset.request','Workspace',next.id,{before:{workspaceId:state.id,patients:patients.length,messages:allRows_('Team_Messages').length},after:{workspaceId:next.id,mode:'empty'},historyRetained:true});
 PropertiesService.getScriptProperties().setProperty('CLINIC_WORKSPACE',JSON.stringify(next));
 audit_(user,'workspace.reset.complete','Workspace',next.id,{before:{workspaceId:state.id},after:next,historyRetained:true});
 return {workspaceId:next.id};
});}
