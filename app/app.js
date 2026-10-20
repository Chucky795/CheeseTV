'use strict';
const $=s=>document.querySelector(s),LS=localStorage;
const S={pls:J('ctv.playlists',[]),active:LS.getItem('ctv.active'),favs:J('ctv.favs',{}),chans:[],group:'All',view:'list',epg:{},epgState:'',cur:null,hls:null,ts:null};
function J(k,d){try{return JSON.parse(LS.getItem(k))??d}catch(e){return d}}
function save(){LS.setItem('ctv.playlists',JSON.stringify(S.pls));LS.setItem('ctv.favs',JSON.stringify(S.favs));if(S.active)LS.setItem('ctv.active',S.active)}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pl=()=>S.pls.find(p=>p.id===S.active)||S.pls[0];
const isMixed=u=>location.protocol==='https:'&&/^http:\/\//i.test(u);
const favSet=()=>new Set(S.favs[pl()?.id]||[]);
const ckey=c=>c.id||c.url;

/* ---------- loading ---------- */
async function getText(url,what){
  if(isMixed(url))throw new Error(`This ${what} link starts with http://. A secure web page (https) isn't allowed to load http links. Ask your provider for an https link, or use the CheeseTV Android/Roku app.`);
  let r;try{r=await fetch(url,{cache:'no-store'})}catch(e){throw new Error(`Couldn't reach the ${what}. The server is offline, or it blocks web browsers (CORS). The CheeseTV Android/Roku app can still load it.`)}
  if(!r.ok)throw new Error(`The ${what} server answered "${r.status} ${r.statusText||''}".`.replace(' "','"'));
  return r.text();
}
function parseM3U(t){
  const out=[];let meta=null;const head=t.match(/#EXTM3U[^\n]*/);const epg=head&&(head[0].match(/(?:url-tvg|x-tvg-url)="([^"]+)"/)||[])[1];
  for(let l of t.split(/\r?\n/)){l=l.trim();if(!l)continue;
    if(l.startsWith('#EXTINF')){const a=k=>(l.match(new RegExp(k+'="([^"]*)"'))||[])[1]||'';meta={name:l.slice(l.lastIndexOf(',')+1).trim(),tvg:a('tvg-id'),logo:a('tvg-logo'),group:a('group-title')||'Other'}}
    else if(l.startsWith('#EXTGRP:')&&meta)meta.group=l.slice(8).trim();
    else if(!l.startsWith('#')){const m=meta||{name:l.split('/').pop(),group:'Other'};out.push({...m,name:m.name||'Channel',url:l});meta=null}}
  if(!out.length)throw new Error("That link loaded, but it isn't an M3U playlist with channels. Check the URL.");
  return {chans:out,epg};
}
async function loadXtream(p){
  const b=p.server.replace(/\/+$/,''),q=`username=${encodeURIComponent(p.user)}&password=${encodeURIComponent(p.pass)}`;
  const info=JSON.parse(await getText(`${b}/player_api.php?${q}`,'Xtream server'));
  if(!info.user_info||String(info.user_info.auth)!=='1')throw new Error('Xtream login failed. Check the server URL, username and password.');
  const fmts=info.user_info.allowed_output_formats||[];p.fmt=fmts.includes('m3u8')||!fmts.length?'m3u8':'ts';
  const [cats,streams]=await Promise.all([getText(`${b}/player_api.php?${q}&action=get_live_categories`,'Xtream server').then(JSON.parse),getText(`${b}/player_api.php?${q}&action=get_live_streams`,'Xtream server').then(JSON.parse)]);
  const cn={};(cats||[]).forEach(c=>cn[c.category_id]=c.category_name);
  const u=encodeURIComponent(p.user),pw=encodeURIComponent(p.pass);
  return {chans:(streams||[]).map(s=>({id:'x'+s.stream_id,name:s.name,logo:s.stream_icon,tvg:s.epg_channel_id||'',group:cn[s.category_id]||'Other',url:`${b}/live/${u}/${pw}/${s.stream_id}.${p.fmt}`,alt:`${b}/live/${u}/${pw}/${s.stream_id}.${p.fmt==='m3u8'?'ts':'m3u8'}`})),epg:`${b}/xmltv.php?${q}`};
}
async function loadActive(){
  const p=pl();S.chans=[];S.epg={};S.epgState='';
  if(!p){render();return}
  S.active=p.id;$('#sub').textContent=p.name;$('#list').innerHTML='<p class="gempty">Loading channels…</p>';
  try{const r=p.type==='xt'?await loadXtream(p):parseM3U(await getText(p.url,'playlist'));S.chans=r.chans;S.epgUrl=p.epg||r.epg||''}
  catch(e){$('#list').innerHTML=`<div class="perr" style="position:static"><h4>Couldn't load "${esc(p.name)}"</h4><p>${esc(e.message)}</p></div>`;renderGroups();return}
  render();loadEpg();
}
/* ---------- EPG (XMLTV) ---------- */
function xt(s){const m=s.match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)\s*([+-]\d{4})?/);if(!m)return 0;const z=m[7]||'+0000';return Date.UTC(m[1],m[2]-1,m[3],m[4],m[5],m[6])-(z[0]==='-'?-1:1)*(parseInt(z.slice(1,3))*60+parseInt(z.slice(3)))*60000}
async function loadEpg(){
  if(!S.epgUrl||!S.chans.some(c=>c.tvg)){S.epgState='none';return}
  if(/\.gz(\?|$)/i.test(S.epgUrl)){S.epgState='gz';return}
  S.epgState='loading';
  try{const doc=new DOMParser().parseFromString(await getText(S.epgUrl,'TV guide'),'text/xml');const now=Date.now(),lo=now-3*36e5,hi=now+12*36e5,e={};
    for(const p of doc.getElementsByTagName('programme')){const a=xt(p.getAttribute('start')||''),b=xt(p.getAttribute('stop')||'');if(b<lo||a>hi)continue;
      (e[p.getAttribute('channel')]??=[]).push({a,b,t:p.getElementsByTagName('title')[0]?.textContent||''})}
    Object.values(e).forEach(v=>v.sort((x,y)=>x.a-y.a));S.epg=e;S.epgState='ok'}catch(err){S.epgState='err:'+err.message}
  render();
}
const nowProg=c=>{const n=Date.now();return (S.epg[c.tvg]||[]).find(p=>p.a<=n&&p.b>n)};
const hm=t=>new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});

/* ---------- render ---------- */
function filtered(){const q=$('#q').value.trim().toLowerCase(),f=favSet();
  return S.chans.filter(c=>(S.view==='fav'||S.group==='★ Favorites'?f.has(ckey(c)):S.group==='All'||c.group===S.group)&&(!q||c.name.toLowerCase().includes(q)))}
function renderGroups(){const g=['All','★ Favorites',...new Set(S.chans.map(c=>c.group))];
  $('#groups').innerHTML=S.chans.length?g.map(x=>`<button class="${x===S.group?'on':''}">${esc(x)}</button>`).join(''):'';
  [...$('#groups').children].forEach((b,i)=>b.onclick=()=>{S.group=g[i];render()})}
function render(){
  const has=S.pls.length>0;$('#empty').hidden=has;$('#iosHint').hidden=!(/iPhone|iPad/.test(navigator.userAgent)&&!navigator.standalone);
  if(!has){$('#list').innerHTML='';$('#groups').innerHTML='';$('#guide').hidden=true;$('#sub').textContent='Web Player';return}
  renderGroups();const g=S.view==='guide';$('#list').hidden=g;$('#guide').hidden=!g;
  const list=filtered(),f=favSet();
  if(g){renderGuide(list);return}
  $('#list').innerHTML=list.length?list.slice(0,1500).map((c,i)=>{const np=nowProg(c);return `<div class="ch" tabindex="0" data-i="${i}"><div class="logo" ${c.logo&&!isMixed(c.logo)?`style="background-image:url('${esc(c.logo)}')"`:''}>${c.logo&&!isMixed(c.logo)?'':'&#128250;'}</div><div class="t"><b>${esc(c.name)}</b>${np?`<small class="now">Now: ${esc(np.t)}</small>`:`<small>${esc(c.group)}</small>`}</div><button class="star ${f.has(ckey(c))?'on':''}" aria-label="Favorite">${f.has(ckey(c))?'★':'☆'}</button></div>`}).join(''):`<p class="gempty">${S.view==='fav'||S.group==='★ Favorites'?'No favorites yet. Tap ☆ on a channel to add it.':'No channels match.'}</p>`;
  [...$('#list').querySelectorAll('.ch')].forEach(el=>{const c=list[el.dataset.i];
    el.onclick=e=>{if(e.target.classList.contains('star')){toggleFav(c);render()}else play(c)};el.onkeydown=e=>{if(e.key==='Enter')play(c)}});
}
function renderGuide(list){const G=$('#guide'),PX=4/60000,n=Date.now(),t0=Math.floor((n-36e5)/18e5)*18e5,W=12*36e5*PX;
  if(S.epgState!=='ok'){G.innerHTML=`<p class="gempty">${{none:"This playlist doesn't include a TV guide (EPG). Add an XMLTV link in Settings to see the guide.",gz:'This TV guide is a compressed .gz file, which browsers can\'t open directly. Use an uncompressed XMLTV link.',loading:'Loading TV guide…'}[S.epgState]||('Couldn\'t load the TV guide. '+esc(S.epgState.slice(4)))}</p>`;return}
  const rows=list.filter(c=>S.epg[c.tvg]).slice(0,300);
  let h=`<div class="ghead"><div class="gch">Today</div><div class="gtl" style="width:${W}px">${Array.from({length:24},(_,i)=>`<span style="position:absolute;left:${i*18e5*PX}px">${hm(t0+i*18e5)}</span>`).join('')}</div></div>`;
  h+=rows.map((c,i)=>`<div class="grow" data-i="${i}"><div class="gch">${esc(c.name)}</div><div class="gtl" style="width:${W}px"><div class="nowline" style="left:${(n-t0)*PX}px"></div>${S.epg[c.tvg].filter(p=>p.b>t0).map(p=>{const l=Math.max(0,(p.a-t0)*PX),w=(p.b-Math.max(p.a,t0))*PX-4;return `<div class="gp ${p.a<=n&&p.b>n?'now':''}" style="left:${l}px;width:${w}px">${esc(p.t)}<small>${hm(p.a)} – ${hm(p.b)}</small></div>`}).join('')}</div></div>`).join('')||'<p class="gempty">No guide data for these channels.</p>';
  G.innerHTML=h;G.querySelectorAll('.grow').forEach(r=>r.onclick=()=>play(rows[r.dataset.i]));G.scrollLeft=Math.max(0,(n-t0)*PX-60);
}
function toggleFav(c){const p=pl(),s=favSet(),k=ckey(c);s.has(k)?s.delete(k):s.add(k);S.favs[p.id]=[...s];save()}

/* ---------- player ---------- */
const V=$('#video');
function stop(){try{S.hls&&S.hls.destroy()}catch(e){}try{S.ts&&(S.ts.destroy())}catch(e){}S.hls=S.ts=null;V.removeAttribute('src');V.load()}
const kind=u=>{const p=u.split('?')[0].toLowerCase();return p.endsWith('.m3u8')||p.endsWith('.m3u')?'hls':p.endsWith('.ts')?'ts':/\.(mp4|webm|mov)$/.test(p)?'file':'unknown'};
const nativeHls=()=>!!V.canPlayType('application/vnd.apple.mpegurl')&&(/iPhone|iPad|iPod/.test(navigator.userAgent)||!window.Hls?.isSupported?.());
function status(t){$('#pStatus').textContent=t||''}
function showErr(title,msg,detail){status('');const isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent);
  $('#pErr').innerHTML=`<h4>${esc(title)}</h4><p>${esc(msg)}</p>${detail?`<p class="d">Details: ${esc(detail)}</p>`:''}<p class="note">Channels that won't play in a browser usually still work in the CheeseTV ${isIOS?'iPhone app (coming soon to the App Store)':'Android / Google TV app'} or on Roku.</p><div class="row"><button class="g" id="eRetry">Try again</button><a href="/#devices">Get the app</a></div>`;
  $('#pErr').hidden=false;$('#eRetry').onclick=()=>play(S.cur)}
function play(c){
  S.cur=c;$('#player').hidden=false;$('#pErr').hidden=true;$('#pName').textContent=c.name;const np=nowProg(c);$('#pNow').textContent=np?`Now: ${np.t} · until ${hm(np.b)}`:c.group;
  $('#btnFavP').textContent=favSet().has(ckey(c))?'★':'☆';
  const tries=[c.url];if(c.alt)tries.push(c.alt);else if(kind(c.url)==='unknown')tries.push(c.url+'.m3u8');
  attempt(tries,0,null);
}
function attempt(tries,i,lastErr){
  stop();if(i>=tries.length){const e=lastErr||{};showErr(e.t||"This channel can't play here",e.m||'The stream did not start.',e.d);return}
  const u=tries[i],next=err=>attempt(tries,i+1,err);
  if(isMixed(u)){showErr("This channel can't play in a browser",'The stream link starts with http://, and secure web pages (https) are not allowed to play http streams. This is a browser security rule, not a problem with your channel.',u.replace(/\/\/([^/]+)\/.*/,'//$1/…'));return}
  status('Loading…');let done=false;const ok=()=>{if(!done){done=true;status('')}};V.onplaying=ok;
  const timer=setTimeout(()=>{if(!done)next({t:'The channel is taking too long',m:"The stream didn't start within 20 seconds. The channel may be offline, or the provider blocks web browsers.",d:'timeout'})},20000);
  const fail=e=>{clearTimeout(timer);if(!done){done=true;next(e)}};
  const k=kind(u);
  V.onerror=()=>fail({t:"This channel can't play here",m:'The browser could not open this stream. It may be offline, use a format browsers do not support, or block web playback.',d:'media error '+(V.error?.code||'')});
  if((k==='hls'||k==='unknown')&&nativeHls()){V.src=u;V.play().catch(()=>{});return}
  if((k==='hls'||k==='unknown')&&window.Hls?.isSupported()){
    const h=S.hls=new Hls({manifestLoadingMaxRetry:1,levelLoadingMaxRetry:2});h.on(Hls.Events.ERROR,(_,d)=>{if(!d.fatal)return;const code=d.response?.code;
      fail(code===0||code===undefined&&d.type==='networkError'?{t:'The provider blocks web playback',m:"The stream server didn't allow this web page to load it (CORS), or it is offline. The CheeseTV apps don't have this limit.",d:d.details}:code?{t:'Stream unavailable',m:`The provider's server answered with error ${code}. The channel may be offline or your login may have expired.`,d:d.details}:{t:"This channel can't play here",m:'The stream format is not supported in this browser.',d:d.details})});
    h.loadSource(u);h.attachMedia(V);h.on(Hls.Events.MANIFEST_PARSED,()=>V.play().catch(()=>{}));return}
  if((k==='ts'||k==='unknown')&&window.mpegts?.getFeatureList().mseLivePlayback){
    const p=S.ts=mpegts.createPlayer({type:'mpegts',isLive:true,url:u},{enableStashBuffer:false,liveBufferLatencyChasing:true});
    p.on(mpegts.Events.ERROR,(t,d,info)=>fail({t:t===mpegts.ErrorTypes.NETWORK_ERROR?'The provider blocks web playback':"This channel can't play here",m:t===mpegts.ErrorTypes.NETWORK_ERROR?"The stream server didn't allow this web page to load it (CORS), or it is offline.":'This stream format is not supported in this browser.',d:`${d} ${info?.msg||''}`}));
    p.attachMediaElement(V);p.load();V.play().catch(()=>{});return}
  if(k==='ts'){clearTimeout(timer);next({t:"This channel can't play in this browser",m:'This is a raw .ts stream. iPhone Safari can only play HLS (.m3u8) streams in a web page.',d:'mpegts not supported'});return}
  V.src=u;V.play().catch(()=>{});
}
$('#btnClose').onclick=()=>{stop();$('#player').hidden=true;render()};
$('#btnFavP').onclick=()=>{toggleFav(S.cur);$('#btnFavP').textContent=favSet().has(ckey(S.cur))?'★':'☆'};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#player').hidden)$('#btnClose').click()});

/* ---------- playlists sheet ---------- */
function openSheet(){const L=$('#plList');L.innerHTML=S.pls.map(p=>`<div class="pl ${p.id===pl()?.id?'on':''}"><b>${esc(p.name)}</b><small>${p.type==='xt'?'Xtream':'M3U'}</small><button data-a="use" data-id="${p.id}">Use</button><button data-a="del" data-id="${p.id}">Delete</button></div>`).join('');
  L.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.a==='del'){if(!confirm('Delete this playlist from this device?'))return;S.pls=S.pls.filter(p=>p.id!==b.dataset.id);delete S.favs[b.dataset.id];if(S.active===b.dataset.id){S.active=S.pls[0]?.id||null;S.active?LS.setItem('ctv.active',S.active):LS.removeItem('ctv.active')}save();openSheet();loadActive()}else{S.active=b.dataset.id;save();$('#sheet').hidden=true;loadActive()}});
  $('#fMsg').textContent='';$('#sheet').hidden=false}
document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x===b));$('#fM3u').hidden=b.dataset.t!=='m3u';$('#fXt').hidden=b.dataset.t!=='xt'});
async function addPl(p){const m=$('#fMsg');m.className='msg';m.textContent='Checking…';
  try{if(p.type==='xt')await loadXtream(p);else parseM3U(await getText(p.url,'playlist'))}catch(e){m.className='msg e';m.textContent=e.message;return}
  p.id='p'+Date.now();S.pls.push(p);S.active=p.id;S.group='All';save();$('#sheet').hidden=true;loadActive()}
$('#fM3u').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);addPl({type:'m3u',name:f.get('name').trim(),url:f.get('url').trim(),epg:f.get('epg').trim()});};
$('#fXt').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);addPl({type:'xt',name:f.get('name').trim(),server:f.get('server').trim(),user:f.get('user').trim(),pass:f.get('pass')});};
$('#btnSettings').onclick=$('#btnAdd1').onclick=openSheet;$('#btnSheetX').onclick=()=>$('#sheet').hidden=true;
$('#q').oninput=()=>render();
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{if(b.dataset.v==='set'){openSheet();return}document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));S.view=b.dataset.v;if(S.view==='fav')S.group='All';render()});
if('serviceWorker' in navigator)navigator.serviceWorker.register('/app/sw.js',{scope:'/app/'}).catch(()=>{});
loadActive();
