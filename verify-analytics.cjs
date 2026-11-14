const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { boot } = require('./verify.cjs');
const source = fs.readFileSync(path.join(__dirname, 'analytics.js'), 'utf8');
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
function tag({host='kitakataramen.aizu.blog', protocol='https:', pathname='/', port='', frame=false, gate='off-confirmed', denied=false, blocked=false, failAppend=false}={}) {
  const scripts=[];
  const w={location:{hostname:host,protocol,pathname,port,href:'https://'+host+pathname+'?q=PRIVATE_SEARCH#PRIVATE_FRAGMENT'},localStorage:{getItem:key=>{assert.equal(key,'kitakata-ramen-analytics-disabled');if(blocked)throw Error('storage blocked');return denied?'true':null;}}};
  w.self=w;w.top=frame?{}:w;
  const doc={currentScript:{dataset:{enhancedMeasurement:gate}},createElement:()=>({}),head:{appendChild:s=>{if(failAppend)throw Error('blocked');scripts.push(s);}}};
  const context=vm.createContext({window:w,document:doc});
  const run=()=>vm.runInContext(source,context);
  run();
  return {w,scripts,run};
}
const commands=x=>Array.from(x.w.dataLayer||[],args=>Array.from(args));
const events=x=>commands(x).filter(c=>c[0]==='event');
(async()=>{
  for(const options of [{host:'localhost'},{host:'127.0.0.1'},{host:'preview.example.com'},{protocol:'http:'},{pathname:'/test-hours.html'},{pathname:'/privacy.html'},{frame:true},{port:'8080'},{gate:'pending'},{denied:true},{blocked:true}]) {
    const x=tag(options);
    check(x.scripts.length===0 && !x.w.dataLayer && !x.w.ramenAnalytics,'no loader or events '+JSON.stringify(options));
  }
  for(const pathname of ['/','/index.html']) {
    const x=tag({pathname}); x.run();
    check(x.scripts.length===1,'single tag loader '+pathname);
    check(x.scripts[0].src==='https://www.googletagmanager.com/gtag/js?id=G-R6YYLGV5H3' && x.scripts[0].referrerPolicy==='no-referrer','correct tag and no HTTP referrer');
    const config=commands(x).find(c=>c[0]==='config');
    check(config[1]==='G-R6YYLGV5H3' && config[2].send_page_view===false && config[2].allow_google_signals===false && config[2].allow_ad_personalization_signals===false,'automatic PV and advertising features off');
    check(events(x).filter(c=>c[1]==='page_view').length===1,'one manual PV');
    x.w.ramenAnalytics.track('map_click',{shop_id:92,shop_name:'PRIVATE_NAME',search_term:'PRIVATE_SEARCH'});
    const map=events(x).at(-1);
    check(map[1]==='map_click' && Object.keys(map[2]).sort().join(',')==='page_location,page_referrer,page_title,send_to','event parameters are fixed allowlist');
    check(map[2].page_location==='https://kitakataramen.aizu.blog/' && map[2].page_referrer==='' && !JSON.stringify(commands(x)).includes('PRIVATE_'),'no URL query, hash, referrer or arbitrary data');
    const count=events(x).length; x.w.ramenAnalytics.track('search');x.w.ramenAnalytics.track('page_view');x.w.ramenAnalytics.track('share_complete');
    check(events(x).length===count,'unknown and duplicate PV events rejected');
    x.scripts[0].onerror();x.w.ramenAnalytics.track('visit_add');
    check(events(x).length===count && x.w['ga-disable-G-R6YYLGV5H3']===true,'loader failure disables measurement');
  }
  const blocked=tag({failAppend:true});
  check(blocked.scripts.length===0,'loader insertion error contained');
  const privacySource=fs.readFileSync(path.join(__dirname,'privacy-settings.js'),'utf8');
  const privacyStore=new Map([['kitakata-ramen-visited-v1','[92,93]']]);
  const privacyElements={};
  const privacyContext=vm.createContext({document:{getElementById:id=>privacyElements[id] ||= {addEventListener:(_,fn)=>{privacyElements[id].click=fn;}}},localStorage:{getItem:key=>privacyStore.get(key)||null,setItem:(key,value)=>privacyStore.set(key,value)}});
  vm.runInContext(privacySource,privacyContext);
  privacyElements['analytics-stop'].click();
  check(privacyStore.get('kitakata-ramen-analytics-disabled')==='true','privacy stop saves only analytics preference');
  privacyElements['analytics-resume'].click();
  check(privacyStore.get('kitakata-ramen-analytics-disabled')==='false' && privacyStore.get('kitakata-ramen-visited-v1')==='[92,93]','privacy resume keeps visit records');
  const privacyBlocked=vm.createContext({document:privacyContext.document,localStorage:{getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('denied');}}});
  vm.runInContext(privacySource,privacyBlocked);privacyElements['analytics-stop'].click();
  check(privacyElements['analytics-setting-status'].textContent.includes('設定を保存できません'),'privacy settings handle denied storage');
  const saved=JSON.stringify([...Array.from({length:67},(_,i)=>i+1),92,93]);
  const x=await boot({stored:saved,now:'2026-11-14T12:00:00',timers:true});
  const count=name=>x.analyticsEvents.filter(e=>e[0]===name).length;
  x.get('shops').children[0].click();x.get('shops').children[0].click();
  check(count('visit_remove')===1 && count('visit_add')===1 && x.storage.get('kitakata-ramen-visited-v1')===saved,'visit events once per toggle and records restored');
  x.get('shops').children[91].querySelector('.map-button').fire('click',{stopPropagation(){}});
  check(count('map_click')===1 && count('visit_add')===1 && count('visit_remove')===1,'map not a visit toggle');
  for(const id of ['share-x','share-x-top','share-facebook-top','share-threads-top']) x.get(id).click();
  check(count('share_x_click')===2 && count('share_facebook_click')===1 && count('share_threads_click')===1,'both X buttons count once each and all SNS counted as clicks');
  x.get('shop-search').value='PRIVATE_SEARCH';x.get('shop-search').fire('input');
  check(x.analyticsEvents.length===7,'search sends nothing');
  x.get('start-diagnosis').click();
  x.run('visitTiming="later"; selectedQuestions=diagnosisQuestions.filter(q=>q.enabled && q.category!=="honest").slice(0,3); currentQuestion=0;');
  const answer=()=>x.get('diagnosis-panel').fire('click',{target:{closest:s=>s==='button[data-answer]'?{dataset:{answer:'0'}}:null}});
  answer();answer();
  check(count('diagnosis_start')===1 && count('diagnosis_result')===0,'questions are not results');
  answer();
  check(count('diagnosis_result')===1,'completion result counted once');
  x.run('showDiagnosisResult(lastDiagnosisShop);');
  check(count('diagnosis_result')===1,'result redisplay is not new completion');
  for(const id of [92,93,2]) {
    x.run('Math.random=()=>'+((id-0.5)/95));
    const before=count('roulette_result');
    x.get('start-roulette').click();
    for(let i=0;i<14;i++)x.takeNextTimer()();
    check(count('roulette_result')===before,'spinning not a result '+id);
    const stale=x.takeNextTimer();x.get('start-diagnosis').click();stale();
    check(count('roulette_result')===before && x.pendingTimers()===0,'cancelled final callback not a result '+id);
    x.get('start-roulette').click();x.runTimers();
    check(count('roulette_result')===before+1,'completed result counted once '+id);
  }
  const stale=[];const before=count('roulette_result');
  for(let i=0;i<3;i++){x.get('start-roulette').click();stale.push(x.takeNextTimer());}
  x.get('start-roulette').click();stale.forEach(f=>f());x.runTimers();
  check(count('roulette_result')===before+1,'repeated starts only latest produces result');
  check(x.analyticsEvents.every(e=>e.length===1 && /^[a-z_]+$/.test(e[0])) && !JSON.stringify(x.analyticsEvents).includes('PRIVATE_'),'hooks pass names only');
  check(x.storage.get('kitakata-ramen-visited-v1')===saved && x.run('visited.length')===69,'analytics flows keep all 69 saved visits');
  for(const analytics of ['throw','absent']) {
    const y=await boot({stored:saved,analytics,now:'2026-11-14T12:00:00',timers:true});
    y.get('shops').children[0].click();y.get('shops').children[0].click();
    y.get('start-diagnosis').click();y.run('finishDiagnosis(shopData[1]);');
    y.get('start-roulette').click();y.runTimers();
    for(const id of ['share-x','share-x-top','share-facebook-top','share-threads-top'])y.get(id).click();
    check(y.storage.get('kitakata-ramen-visited-v1')===saved && !y.get('start-roulette').disabled && y.sandbox.opened.length===4,'missing or throwing analytics does not break app '+analytics);
  }
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  check((html.match(/src="analytics.js"/g)||[]).length===1 && html.includes('name="referrer" content="no-referrer"') && html.includes('href="privacy.html"'),'one loader, referrer suppression and privacy link');
  check(!fs.readFileSync(path.join(__dirname,'privacy.html'),'utf8').includes('src="analytics.js"'),'privacy page has no tag');
  console.log('PASS '+checks+' analytics checks (VM/stubs; no data sent to Google)');
})().catch(e=>{console.error(e);process.exitCode=1;});
