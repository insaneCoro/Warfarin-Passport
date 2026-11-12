const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});try{
 for(const width of [1440,820,390]){
  const p=await b.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto((process.env.TEST_URL||'http://127.0.0.1:8000/')+'?mode=demo');await p.getByRole('heading',{name:'Clinic dashboard',exact:true}).waitFor();
  await p.locator('#dashboard-search').fill('Sample Patient A');if(await p.locator('#dashboard-registry [data-open]').count()!==1)throw Error('Dashboard filter failed');await p.locator('#dashboard-search').fill('');
  await p.screenshot({path:`docs/dashboard-${width}.png`,fullPage:true});
  await p.locator('#dashboard-registry [data-open]').first().click();await p.getByRole('button',{name:/WhatsApp/}).click();await p.getByRole('heading',{name:'Example INR reminder'}).waitFor();await p.locator('#care-form [type=submit]').click();
  await p.getByRole('button',{name:'Review latest INR',exact:true}).click();await p.locator('[name=inr]').fill('4');const today=await p.evaluate(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));await p.locator('[name=inrDate]').fill(today);
  for(const name of ['bleeding','missed','interactions','illness','recentChange'])await p.locator(`[name=${name}]`).selectOption('no');
  await p.locator('[name=baselineConfirmed]').selectOption('yes');await p.getByRole('button',{name:'Next',exact:true}).click();
  await p.getByText(/midpoint example 31.5 mg/).waitFor();if(await p.locator('[name=weeklyMg]').inputValue()!=='35')throw Error('Reference auto-applied dose');
  await p.screenshot({path:`docs/dose-review-${width}.png`,fullPage:false});
  await p.getByRole('button',{name:'Back',exact:true}).click();await p.locator('[name=bleeding]').selectOption('yes');await p.getByRole('button',{name:'Next',exact:true}).click();await p.getByText('Emergency assessment',{exact:true}).waitFor();if(await p.locator('#reference-output').innerText().then(t=>t.includes('31.5')))throw Error('Emergency still shows numeric dose');await p.getByRole('button',{name:'Cancel',exact:true}).click();
  await p.screenshot({path:`docs/passport-workspace-${width}.png`,fullPage:true});
  await p.locator('[data-nav=messages]').click();await p.locator('#message-body').fill('Synthetic team handover <script>unsafe()</script>');await p.getByRole('button',{name:'Post demo message'}).click();await p.getByText('Synthetic team handover <script>unsafe()</script>',{exact:true}).waitFor();
  await p.locator('[data-reply]').first().click();await p.locator('#message-body').fill('Synthetic reply');await p.getByRole('button',{name:'Post demo message'}).click();await p.getByText('Synthetic reply',{exact:true}).waitFor();await p.reload();await p.locator('[data-nav=messages]').click();await p.getByText('Synthetic reply',{exact:true}).waitFor();
  if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Page overflows viewport');if(errors.length)throw Error(errors.join(';'));console.log(width+': dashboard, reference gating, WhatsApp placeholder, safe persistent team replies passed');await p.close();
 }
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
