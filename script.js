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
["Clayface","Movie · Oct 23, 2026","DC Horror","A vain Hollywood actor's face, and life, start melting away in this R-rated Batman-villain spinoff. No. 1 at the box office this weekend.","In theaters (Warner Bros.)"],
["You Can See Everything","Movie · Wide Oct 23, 2026","Documentary","Nathan Fielder and Lance Oppenheim's three-hour Elizabeth Holmes documentary, the surprise hit everyone's talking about.","In theaters (A24)"],
["Wildwood","Movie · Oct 23, 2026","Stop-Motion Animation","Laika's gorgeous new stop-motion adventure from director Travis Knight, with an A CinemaScore and rave reviews.","In theaters (Fathom)"],
["Wicker","Movie · Oct 23, 2026","Period Comedy","Olivia Colman orders herself a husband made of wicker, played by Alexander Skarsgård. Cheeky, romantic and a word-of-mouth hit.","In theaters (Black Bear)"],
["Street Fighter","Movie · Oct 16, 2026","Video Game Action","The Capcom fighting-game legends hit the big screen in a loud, bone-crunching tournament brawl.","In theaters (Paramount)"],
["The Invite","Movie · Oct 23, 2026","Comedy Drama","Olivia Wilde, Seth Rogen, Penélope Cruz and Edward Norton at a dinner party that blows two marriages wide open.","HBO Max"],
["Minions & Monsters","Movie · Oct 28, 2026","Animated Comedy","The Minions are 1920s silent-film stars who accidentally unleash monsters on Los Angeles. Family movie night, sorted.","Peacock"],
["The Mongoose","Movie · Oct 30, 2026","Action Thriller","Liam Neeson is back in action mode, with Marisa Tomei and Ving Rhames along for the ride.","In theaters"],
["Godzilla Minus Zero","Movie · Nov 6, 2026","Kaiju Action","The follow-up to the Oscar-winning Godzilla Minus One, with Ryunosuke Kamiki and Minami Hamabe back.","In theaters (GKIDS)"],
["The Cat in the Hat","Movie · Nov 6, 2026","Animated Family","Warner Bros.' animated take on the Dr. Seuss classic, with Bill Hader, Xochitl Gomez and Quinta Brunson in the voice cast.","In theaters (Warner Bros.)"]],
series:[
["Nocturne","Show · Premieres Oct 30, 2026","Crime Thriller","Liev Schreiber plays an ex-soldier turned detective hunting a ruthless serial killer (Stephen Graham), with Zazie Beetz as an FBI agent.","Apple TV"],
["Dexter: Resurrection","Show · Season 2, Oct 30, 2026","Crime Drama","America's favorite serial killer is back for another season of dark secrets and close calls.","Paramount+"],
["The Gilded Age","Show · Season 4, Nov 1, 2026","Period Drama","Old money versus new money in 1880s New York, with more feuds, fashion and scandal.","HBO, HBO Max"],
["The Greatest","Show · Premieres Nov 4, 2026","Biopic Drama","Jaalen Best stars as Cassius Clay and Muhammad Ali in the first authorized scripted series about the champ.","Prime Video"],
["Black Doves","Show · Season 2, Nov 5, 2026","Spy Thriller","The stylish London spy thriller returns with all six new episodes at once.","Netflix"],
["Nobody Wants This","Show · Season 3, Oct 22, 2026","Romantic Comedy","The rom-com about an outspoken podcaster and a rabbi is back with 10 new episodes to binge.","Netflix"],
["The Terminal List","Show · Season 2, Oct 21, 2026","Action Thriller","Navy SEAL James Reece returns for another hard-hitting season, all eight episodes at once.","Prime Video"],
["Minimum Wage","Show · Premieres Oct 26, 2026","Comedy","Teens try to keep a pizza shop running for a manic boss (Randall Park). Based on the hit social media shorts.","Netflix"],
["Phony","Show · Premieres Oct 20, 2026","Mystery Thriller","After a car crash, a teen (Sam Nivola) is convinced his mom (Connie Britton) is an impostor.","Hulu"],
["VisionQuest","Show · New episodes weekly","Superhero Drama","Hunted and haunted by Ultron, Vision has to figure out what he really is. The series finale lands Nov 10.","Disney+"]]};
document.querySelectorAll('[data-row]').forEach(r=>{const s=r.dataset.row;r.innerHTML=D[s].map(([t,y,g,d,w],i)=>{const[a,b]=s==="halloween"?(i%2?["#a855f7","#1e0a33"]:["#ff7a18","#2a0f00"]):P[i%P.length];return`<article class="tile rec" style="--a:${a};--b:${b}"><div class="rec-top"><span class="rec-no">${String(i+1).padStart(2,'0')}</span><span class="rec-g">${g}</span></div><h4>${t}</h4><p class="rec-y">${y}</p><p class="rec-d">${d}</p><p class="rec-w"><span>Where to watch</span>${w}</p></article>`}).join('')});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));
