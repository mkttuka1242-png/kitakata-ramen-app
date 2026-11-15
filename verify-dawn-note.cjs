const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { boot } = require('./verify.cjs');
const source = fs.readFileSync(path.join(__dirname, 'dawn-note.js'), 'utf8');
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
function setup(instant) {
  let now = Date.parse(instant);
  const queue = new Map(); let nextId = 0;
  const handlers = {};
  const listeners = new Map();
  const target = name => ({
    addEventListener:(event,fn)=>{const key=name+':'+event;if(!listeners.has(key))listeners.set(key,new Set());listeners.get(key).add(fn);handlers[event]=fn;},
    removeEventListener:(event,fn)=>{listeners.get(name+':'+event)?.delete(fn);if(handlers[event]===fn)delete handlers[event];},
  });
  const note = { isConnected: true, hidden: true, textContent: '' };
  class Clock extends Date { static now() { return now; } }
  const context = vm.createContext({
    Date: Clock,
    window: target('window'),
    document: target('document'),
    setTimeout:(fn,delay)=>{const id=++nextId;queue.set(id,{fn,at:now+delay});return id;},
    clearTimeout:id=>queue.delete(id),
  });
  vm.runInContext(source,context);
  const mount = element => context.window.ramenDawnNote.mount(element);
  mount(note);
  const advance = instant => {
    now=Date.parse(instant);
    const due=Array.from(queue.entries()).filter(([,v])=>v.at<=now);
    for(const [id,{fn}] of due){queue.delete(id);fn();}
  };
  return {note,queue,handlers,mount,unmount:()=>context.window.ramenDawnNote.unmount(),listenerCount:()=>Array.from(listeners.values()).reduce((sum,set)=>sum+set.size,0),advance,setTime:instant=>{now=Date.parse(instant);}};
}
(async()=>{
  for(const [instant,expected] of [
    ['2026-11-14T14:59:59.999Z',''], // 日本時間23:59:59.999
    ['2026-11-14T15:00:00.000Z','本日11月15日 明け方'],
    ['2026-11-14T18:59:59.999Z','本日11月15日 明け方'],
    ['2026-11-14T19:00:00.000Z',''],
    ['2026-11-14T19:00:00.001Z',''],
    ['2026-11-15T03:00:00.000Z',''],
  ]) {
    const x=setup(instant);
    check(x.note.textContent===expected && x.note.hidden===(expected===''),'JST boundary '+instant);
    check(x.queue.size===1,'only one display timer '+instant);
  }
  for(const [before,midnight,four,expected] of [
    ['2026-11-14T23:59:59+09:00','2026-11-15T00:00:00+09:00','2026-11-15T04:00:00+09:00','本日11月15日 明け方'],
    ['2026-11-30T23:59:59+09:00','2026-12-01T00:00:00+09:00','2026-12-01T04:00:00+09:00','本日12月1日 明け方'],
    ['2026-12-31T23:59:59+09:00','2027-01-01T00:00:00+09:00','2027-01-01T04:00:00+09:00','本日1月1日 明け方'],
    ['2028-02-28T23:59:59+09:00','2028-02-29T00:00:00+09:00','2028-02-29T04:00:00+09:00','本日2月29日 明け方'],
  ]) {
    const x=setup(before);x.advance(midnight);
    check(!x.note.hidden && x.note.textContent===expected,'open screen follows date change '+midnight);
    x.advance(four);
    check(x.note.hidden && x.note.textContent==='' && x.queue.size===1,'open screen hides at four '+four);
  }
  for(const event of ['visibilitychange','pageshow','focus']) {
    const x=setup('2026-11-15T03:59:59+09:00');
    x.setTime('2026-11-15T04:10:00+09:00');x.handlers[event]();
    check(x.note.hidden && x.queue.size===1,'resume after four '+event);
    x.setTime('2026-12-01T00:01:00+09:00');x.handlers[event]();
    check(x.note.textContent==='本日12月1日 明け方' && !x.note.hidden && x.queue.size===1,'resume after date change '+event);
  }
  const detached=setup('2026-11-15T03:59:59+09:00');
  detached.note.isConnected=false;detached.advance('2026-11-15T04:00:00+09:00');
  check(detached.queue.size===0 && detached.note.textContent==='本日11月15日 明け方','leaving screen stops display timer without writing to removed element');
  const remount=setup('2026-11-15T03:00:00+09:00');
  const stale=Array.from(remount.queue.values())[0].fn;
  const fresh={isConnected:true};remount.mount(fresh);
  const snapshot=JSON.stringify(fresh);stale();
  check(remount.queue.size===1 && JSON.stringify(fresh)===snapshot,'remount invalidates old callback');
  const saved=JSON.stringify(Array.from({length:69},(_,i)=>i+1));
  const app=await boot({stored:saved,now:'2026-11-15T01:00:00+09:00'});
  let mounted=null;let unmounted=0;app.sandbox.window.ramenDawnNote={mount:element=>{mounted=element;},unmount:()=>{unmounted++;}};
  app.get('start-diagnosis').click();
  check(mounted===app.get('diagnosis-dawn-note') && app.get('diagnosis-panel').innerHTML.includes('diagnosis-later-row'),'timing screen mounts separate note');
  app.get('diagnosis-panel').fire('click',{target:{closest:s=>s==='button[data-visit-timing]'?{dataset:{visitTiming:'later'}}:null}});
  check(app.run('getVisitDate()===null') && app.storage.get('kitakata-ramen-visited-v1')===saved,'later semantics and all 69 visits unchanged');
  check(app.analyticsEvents.length===1 && app.analyticsEvents[0][0]==='diagnosis_start','display adds no analytics events');
  check(unmounted===2,'timing entry and question exit both call cleanup');
  for(const [opened,left] of [
    ['2026-11-15T04:01:00+09:00','2026-11-15T04:02:00+09:00'],
    ['2026-11-14T23:59:59.999+09:00','2026-11-15T00:00:00+09:00'],
    ['2026-11-15T00:00:00+09:00','2026-11-15T00:00:00.001+09:00'],
    ['2026-11-15T03:59:59.999+09:00','2026-11-15T04:00:00+09:00'],
    ['2026-11-15T04:00:00+09:00','2026-11-15T04:00:00.001+09:00'],
  ]) {
    const x=setup(opened);
    const staleTimer=Array.from(x.queue.values())[0].fn;
    const staleEvents=Object.values(x.handlers);
    x.setTime(left);x.unmount();
    const oldSnapshot=JSON.stringify(x.note);
    check(x.queue.size===0 && x.listenerCount()===0,'exit immediately removes timer and all events '+opened);
    staleTimer();staleEvents.forEach(fn=>fn());
    check(x.queue.size===0 && x.listenerCount()===0 && JSON.stringify(x.note)===oldSnapshot,'queued work after exit cannot revive timer or write old element '+opened);
    x.setTime('2026-12-01T00:01:00+09:00');
    const fresh={isConnected:true};x.mount(fresh);
    check(fresh.textContent==='本日12月1日 明け方' && !fresh.hidden && x.queue.size===1 && x.listenerCount()===3,'reentry uses current JST and single set of resources '+opened);
    const freshSnapshot=JSON.stringify(fresh),newTimer=Array.from(x.queue.keys())[0];
    staleTimer();staleEvents.forEach(fn=>fn());
    check(JSON.stringify(fresh)===freshSnapshot && x.queue.has(newTimer) && x.queue.size===1 && x.listenerCount()===3,'old callbacks cannot change new element or new timer '+opened);
    for(let i=0;i<20;i++) {x.unmount();check(x.queue.size===0 && x.listenerCount()===0,'repeated exit '+opened+' '+i);x.mount({isConnected:true});}
    check(x.queue.size===1 && x.listenerCount()===3,'repeated reentry has no duplicate resources '+opened);
    // 同じ表示中でも、復帰イベントで更新し直した後の古いタイマーは無効。
    const beforeResume=Array.from(x.queue.values())[0].fn;
    x.handlers.focus();const resumedTimer=Array.from(x.queue.keys())[0];beforeResume();
    check(x.queue.has(resumedTimer) && x.queue.size===1,'superseded same-screen timer cannot replace new timer '+opened);
    x.unmount();x.unmount();check(x.queue.size===0 && x.listenerCount()===0,'cleanup is idempotent '+opened);
  }
  // 実際の画面切替ハンドラにモジュールをつなぎ、4:01の質問遷移で即時解除。
  const lifecycle=setup('2026-11-15T04:01:00+09:00');lifecycle.unmount();
  const integrated=await boot({stored:saved,now:'2026-11-15T04:01:00+09:00'});
  integrated.sandbox.window.ramenDawnNote={mount:element=>{element.isConnected=true;lifecycle.mount(element);},unmount:lifecycle.unmount};
  integrated.get('start-diagnosis').click();
  check(lifecycle.queue.size===1 && lifecycle.listenerCount()===3,'4:01 timing screen owns timer and listeners');
  integrated.get('diagnosis-panel').fire('click',{target:{closest:s=>s==='button[data-visit-timing]'?{dataset:{visitTiming:'later'}}:null}});
  check(lifecycle.queue.size===0 && lifecycle.listenerCount()===0 && integrated.run('getVisitDate()===null'),'4:01 actual question transition immediately disposes note');
  integrated.get('start-diagnosis').click();integrated.get('start-roulette').click();
  check(lifecycle.queue.size===0 && lifecycle.listenerCount()===0,'roulette transition immediately disposes note');
  check(integrated.storage.get('kitakata-ramen-visited-v1')===saved && integrated.analyticsEvents.map(e=>e[0]).join(',')==='diagnosis_start,diagnosis_start,roulette_start','lifecycle leaves visits and existing analytics unchanged');
  console.log('PASS '+checks+' dawn-note checks (VM/stubs, explicit JST instants)');
})().catch(error=>{console.error(error);process.exitCode=1;});
