const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const base=process.env.TEST_URL||'http://127.0.0.1:8002/';
 const p=await b.newPage({viewport:{width:820,height:1180}});await p.goto(base+'?mode=demo');await p.locator('#dashboard-registry [data-open="DEMO-005"]').click();
 await p.locator('#dose-review').getByText(/midpoint example 31.5 mg/).waitFor();if(await p.locator('[role=dialog]').count())throw Error('Guidance required modal');
 const flag=p.locator('.passport-metrics .tag').filter({hasText:'Above target'});await flag.waitFor();if(await flag.evaluate(el=>getComputedStyle(el).color)!=='rgb(159, 23, 39)')throw Error('Out-of-range flag not red');
 await p.getByRole('button',{name:'WhatsApp — setup pending',exact:true}).locator('svg').waitFor();await p.getByRole('region',{name:'Urgent clinical reviews'}).getByText(/Sample Patient G/).waitFor();
 await p.getByRole('button',{name:'High-risk status',exact:true}).click();await p.locator('[name=riskLevel]').selectOption('routine');await p.locator('#modal-form [type=submit]').click();await p.reload();await p.locator('#dashboard-registry [data-open="DEMO-005"]').click();if(await p.locator('.patient-risk-banner').count())throw Error('Risk edit did not persist');await p.close();
 for(const role of ['admin','clinician']){
  const page=await b.newPage({viewport:{width:820,height:1180}});let prepared=0,resets=0,reset=false;const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://identitytoolkit.googleapis.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({idToken:'synthetic-token',expiresIn:3600})}));
  await page.route('https://warfarin-passport-api.m-k-altaher.workers.dev/**',async r=>{const {action,params}=r.request().postDataJSON();let result;
   if(action==='auth.me')result={uid:'synthetic-'+role,role,displayName:'Synthetic '+role,workspaceId:reset?'new-workspace':'',workspaceMode:reset?'empty':'development'};
   else if(action==='workspace.prepare'){prepared++;result=reset?{remaining:0,disabled:true}:{remaining:0};}
   else if(action==='patients.list'||action==='users.list')result=[];
   else if(action==='workspace.reset'){if(role!=='admin'||params.confirmation!=='RESET DEVELOPMENT DATA'||!params.confirmArchive||params.expectedWorkspace!=='')throw Error('Unsafe reset request');resets++;reset=true;result={workspaceId:'new-workspace'};}
   else throw Error('Unexpected '+action);await r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,result})});
  });
  await page.goto(base+'?mode=connected&view=staff');const login=async()=>{await page.locator('[name=email]').fill(role+'@example.test');await page.locator('[name=password]').fill('synthetic-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).waitFor();};await login();
  if(await page.locator('#load-samples').count())throw Error('Sample button exposed');
  if(role==='admin'){if(prepared!==1)throw Error('No automatic preparation');await page.locator('#reset-workspace').click();if(resets)throw Error('Reset without confirmation');await page.locator('#modal-form [name=confirmation]').fill('RESET DEVELOPMENT DATA');await page.locator('#modal-form [name=confirmArchive]').check();await page.locator('#modal-form [type=submit]').click();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();if(resets!==1)throw Error('Reset duplicated');await login();if(!await page.locator('#reset-workspace').isDisabled())throw Error('Reset did not stay empty');}
  else if(await page.locator('#reset-workspace').count()||prepared||resets)throw Error('Admin functions exposed to clinician');
  if(errors.length)throw Error(errors.join(';'));await page.close();
 }
 console.log('Passport dose example, red flags, risk persistence, WhatsApp icon, urgent alerts, automatic preparation and admin-only confirmed reset passed');
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
