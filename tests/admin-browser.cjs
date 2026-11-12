const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:820,height:1180}}),errors=[];p.on('pageerror',e=>errors.push(e.message));let seedCalls=0,upserts=0;const users=[{uid:'test-admin',email:'admin@example.test',displayName:'Test admin',role:'admin',active:true}];
 await p.route('https://identitytoolkit.googleapis.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({idToken:'synthetic-mocked-token',expiresIn:3600})}));
 await p.route('https://warfarin-passport-api.m-k-altaher.workers.dev/**',async route=>{const {action,params}=route.request().postDataJSON();let result;
 if(action==='auth.me')result={uid:'test-admin',email:'admin@example.test',displayName:'Test admin',role:'admin'};
 else if(action==='patients.list')result=[];
 else if(action==='users.list')result=users;
 else if(action==='users.upsert'){upserts++;if(params.password)throw Error('Unexpected password');users.push({...params});result={uid:params.uid,role:params.role};}
 else if(action==='workspace.prepare'){seedCalls++;if(seedCalls===1)return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:false,errorCode:'SERVER_BUSY',error:'Clinic is busy saving another request. Please wait a moment and retry.'})});result={created:[seedCalls===2?'DEMO-001':'DEMO-002'],skipped:[],remaining:seedCalls===2?1:0,total:2};}
 else throw Error('Unexpected action '+action);return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,result})});});
 await p.goto((process.env.TEST_URL||'http://127.0.0.1:8001/')+'?mode=connected&view=staff');await p.locator('[name=email]').fill('admin@example.test');await p.locator('[name=password]').fill('synthetic-password');await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.getByRole('heading',{name:'Admin & staff',exact:true}).waitFor();await p.getByText('Test admin',{exact:true}).first().waitFor();
 const form=p.locator('#staff-form');await form.locator('[name=email]').fill('clinician@example.test');await form.locator('[name=displayName]').fill('Synthetic clinician');await form.locator('[name=role]').selectOption('clinician');await p.getByRole('button',{name:'Save staff access'}).click();await p.getByText('Synthetic clinician',{exact:true}).waitFor();if(upserts!==1)throw Error('Unexpected staff write count');
 if(seedCalls!==3)throw Error('Automatic preparation or bounded busy retry failed');if(await p.locator('#load-samples').count())throw Error('Removed sample button remains');if(errors.length)throw Error(errors.join(';'));await p.screenshot({path:'docs/admin-staff-820.png',fullPage:true});console.log('Same-login admin navigation, staff approval, busy retry and sequential sample progress verified with synthetic mocks');
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
