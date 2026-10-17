document.getElementById('yr').textContent=new Date().getFullYear();
const links=document.querySelector('.links');
document.querySelector('.burger').onclick=()=>links.classList.toggle('show');
links.querySelectorAll('a').forEach(a=>a.onclick=()=>links.classList.remove('show'));
document.querySelectorAll('.acc button').forEach(b=>b.onclick=()=>{const a=b.parentElement,p=b.nextElementSibling;a.classList.toggle('open');p.style.maxHeight=a.classList.contains('open')?p.scrollHeight+'px':0;});
const showThanks=()=>{if(location.hash==='#contact-thanks'){document.getElementById('thanks').hidden=false;document.getElementById('contact').scrollIntoView();}};showThanks();addEventListener('hashchange',showThanks);
// TV guide: real US listings from TVmaze (CC BY-SA), text only
const g=document.getElementById('guideGrid');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const tfmt=d=>d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
async function loadGuide(){
  const now=new Date(),tmr=new Date(now.getTime()+864e5);
  try{
    const res=await Promise.all([now,tmr].map(d=>fetch(`https://api.tvmaze.com/schedule?country=US&date=${ymd(d)}`).then(r=>{if(!r.ok)throw 0;return r.json()})));
    const by={};
    res.flat().forEach(e=>{const net=e.show&&e.show.network&&e.show.network.name;if(!net||!e.airstamp)return;
      const s=new Date(e.airstamp),en=new Date(s.getTime()+(e.runtime||e.show.runtime||30)*6e4);
      if(en<=now||s-now>4*36e5)return;(by[net]=by[net]||[]).push({s,en,show:e.show.name,ep:e.name,sn:e.season,num:e.number});});
    const rows=Object.entries(by).map(([n,l])=>{l.sort((a,b)=>a.s-b.s);return[n,l.slice(0,3)]})
      .sort((a,b)=>(b[1][0].s<=now)-(a[1][0].s<=now)||a[1][0].s-b[1][0].s).slice(0,14);
    if(!rows.length)throw 0;
    g.innerHTML=`<div class="lg-head"><span>Network</span><span>Now &amp; next · ${esc(tfmt(now))}</span></div>`+rows.map(([n,l])=>`<div class="lg-row"><div class="lg-net">${esc(n)}</div><div class="lg-progs">${l.map(p=>{const on=p.s<=now;const ep=p.ep&&p.ep!==p.show?`${p.sn&&p.num?`S${p.sn} E${p.num} · `:''}${esc(p.ep)}`:'';return`<div class="lg-p${on?' now':''}"><span class="lg-t">${on?'<em>ON NOW</em> ':''}${esc(tfmt(p.s))} – ${esc(tfmt(p.en))}</span><b>${esc(p.show)}</b>${ep?`<small>${ep}</small>`:''}</div>`}).join('')}</div></div>`).join('');
  }catch(_){g.innerHTML='<p class="lg-fail">📺 We couldn\'t load live TV listings right now. Please check back in a few minutes.</p>';}
}
loadGuide();setInterval(loadGuide,5*6e4);
// What's Worth Watching (text-only recommendation cards)
const P=[["#f0a500","#3a1c00"],["#4cc9f0","#0b1a4a"],["#f72585","#2b0538"],["#95d5b2","#0b2b1e"],["#ffd76a","#1b2a5a"],["#e09f3e","#3b0b0e"],["#a78bfa","#14103a"],["#fb8b24","#2a0f1e"]];
const D={halloween:[
["Halloween",1978,"Slasher","A masked killer comes home to a quiet suburb on the spookiest night of the year. The blueprint for every slasher that followed.","Shudder, AMC+"],
["Psycho",1960,"Psychological Thriller","A woman on the run checks into a lonely motel run by a polite young man. Hitchcock's twisty, endlessly copied shocker.","Netflix, Peacock"],
["The Exorcist",1973,"Supernatural","A mother turns to two priests when her daughter starts changing in terrifying ways. Still one of the scariest films ever made.","HBO Max"],
["Alien",1979,"Sci-Fi Horror","A space freighter crew picks up an uninvited guest. Claustrophobic, relentless and beautifully built.","Netflix"],
["The Shining",1980,"Psychological Horror","A writer takes his family to a snowed-in hotel for the winter, and the hotel takes him. Hypnotic, icy dread.","HBO Max"],
["Get Out",2017,"Social Thriller","A weekend with his girlfriend's family turns into something far more sinister. Sharp, funny and deeply unnerving.","Peacock"],
["Hereditary",2018,"Supernatural","A grieving family uncovers a dark inheritance. Devastating, and it lingers for days.","HBO Max, Hulu, Prime Video"],
["Talk to Me",2023,"Supernatural","Teens get hooked on a party trick that lets spirits in. Slick, fast and genuinely scary.","HBO Max"],
["Sinners",2025,"Vampire Horror","Twin brothers open a juke joint in 1930s Mississippi, and something hungry shows up. Bold, musical and bloody.","HBO Max"],
["Weapons",2025,"Mystery Horror","A whole class of kids vanishes in the same night, and a town hunts for answers. Puzzle-box horror with a wicked streak.","HBO Max, Prime Video"]],
movies:[
["Disclosure Day",2026,"Sci-Fi Thriller","A world-shaking question about life beyond Earth becomes very personal. Big-canvas suspense with real heart.","Peacock"],
["Backrooms",2026,"Horror","A man slips into an endless maze of empty, buzzing office spaces. Pure liminal dread, inspired by the internet legend.","HBO Max"],
["Obsession",2026,"Horror","One careless wish makes a coworker devoted to him, and it goes horribly wrong. A smart, unsettling twist on possession stories.","Peacock"],
["Hokum",2026,"Horror","A grieving novelist checks into a remote inn and hears tales of a witch in the honeymoon suite. Slow-burn chills with a dark past attached.","Hulu"],
["Teenage Sex and Death at Camp Miasma",2026,"Horror Comedy","A director rebooting an old slasher meets its reclusive original star, and things get bloody. Wickedly funny and weird.","MUBI"],
["Sacrifice",2026,"Action Comedy","A fading action star is taken hostage at a glitzy charity gala by a doomsday cult. Absurd, satirical and loud.","Netflix"],
["Animals",2026,"Crime Thriller","A Los Angeles mayoral race collides with a kidnapping, and every choice gets uglier. A twisty, star-packed thriller.","Netflix"],
["Spider-Man: Brand New Day",2026,"Superhero Action","A forgotten hero fights crime alone while changing in ways he can't control. A fresh chapter for the web-slinger.","Digital rent or buy (Prime Video, Apple TV, Fandango At Home)"]],
series:[
["East of Eden",2026,"Drama","A magnetic, dangerous woman splits two brothers apart in a sweeping family saga across generations.","Netflix"],
["Lanterns",2026,"Superhero Mystery","Two cosmic cops, one rookie and one legend, chase a murder in small-town America. Gritty and grounded.","HBO Max"],
["Ted Lasso",2020,"Comedy","An endlessly upbeat American coach takes on English soccer. Warm, funny and back for more.","Apple TV"],
["Slow Horses",2022,"Spy Thriller","Disgraced spies and their gloriously awful boss keep stumbling into real danger. Sharp, funny espionage.","Apple TV"],
["Carrie",2026,"Horror Drama","A bullied teen in the social-media age discovers frightening new powers. A modern take on a horror classic.","Prime Video"],
["War",2026,"Legal Drama","Two powerhouse London law firms go to battle over an explosive divorce. Slick, cutthroat courtroom drama.","HBO Max"],
["The Diplomat",2023,"Political Thriller","An ambassador who never wanted the job keeps averting crises while her marriage burns. Fast, witty and tense.","Netflix"],
["VisionQuest",2026,"Superhero Drama","Hunted and haunted by Ultron, Vision has to figure out what he really is. A strange, cerebral Marvel finale.","Disney+"]]};
document.querySelectorAll('[data-row]').forEach(r=>{const s=r.dataset.row;r.innerHTML=D[s].map(([t,y,g,d,w],i)=>{const[a,b]=s==="halloween"?(i%2?["#a855f7","#1e0a33"]:["#ff7a18","#2a0f00"]):P[i%P.length];return`<article class="tile rec" style="--a:${a};--b:${b}"><div class="rec-top"><span class="rec-no">${String(i+1).padStart(2,'0')}</span><span class="rec-g">${g}</span></div><h4>${t}</h4><p class="rec-y">${y}</p><p class="rec-d">${d}</p><p class="rec-w"><span>Where to watch</span>${w}</p></article>`}).join('')});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));
