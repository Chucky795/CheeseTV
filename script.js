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
const D={movies:[
["Godzilla Minus Zero","Movie · Nov 6, 2026","Kaiju Action","The follow-up to Godzilla Minus One opened at No. 1 with $31.6 million. Reviews are at 90% on Rotten Tomatoes.","In theaters (GKIDS)"],
["The Cat in the Hat","Movie · Nov 6, 2026","Animated Family","Warner Bros.' animated take on the Dr. Seuss classic, with Bill Hader voicing the Cat, opened in second place.","In theaters (Warner Bros.)"],
["Drummer Boy","Movie · Nov 6, 2026","Historical Musical","Angel Studios' Revolutionary War musical about two brothers who fight on opposite sides opened in third place this weekend.","In theaters (Angel Studios)"],
["Wild Horse Nine","Movie · Nov 6, 2026","Dark Comedy","Martin McDonagh's new film, with Sam Rockwell and John Malkovich as CIA agents sent to Easter Island before Chile's 1973 coup.","In theaters (Searchlight)"],
["I Play Rocky","Movie · Limited Nov 6, 2026","Biographical Drama","Peter Farrelly's film starring Anthony Ippolito as a young Sylvester Stallone fighting to star in his own script. It expands wide Nov 20.","In theaters (Amazon MGM)"],
["Club Kid","Movie · Limited Nov 6, 2026","Comedy Drama","Jordan Firstman's A24 film follows a New York club promoter who discovers he has a 10-year-old son.","In theaters (A24)"],
["Ebenezer: A Christmas Carol","Movie · Nov 13, 2026","Holiday Drama","Johnny Depp plays Scrooge in director Ti West's new take on the Dickens classic.","In theaters (Paramount)"],
["How to Rob a Bank","Movie · Nov 13, 2026","Action Heist","Nicholas Hoult and Zoë Kravitz pull off viral bank heists in David Leitch's R-rated thriller, with Pete Davidson and John C. Reilly.","In theaters"],
["Victorian Psycho","Movie · Nov 13, 2026","Period Horror","An eccentric governess at a remote gothic estate hides a violent streak as staff members start disappearing.","In theaters (Bleecker Street)"],
["The Hunger Games: Sunrise on the Reaping","Movie · Nov 20, 2026","Dystopian Action","Lionsgate's Hunger Games prequel opens wide next week.","In theaters (Lionsgate)"]],
series:[
["The Institute","Show · Season 2, Nov 8, 2026","Sci-Fi Thriller","The escaped psychic kids fight to keep the Institute dead as a tech billionaire (Alfie Allen) helps rebuild it. The story now goes beyond Stephen King's book.","MGM+"],
["City of God: The Fight Rages On","Show · Season 2, Nov 8, 2026","Crime Drama","Season 2 of the Brazilian crime drama premieres today.","HBO Max"],
["Black Doves","Show · Season 2, Nov 5, 2026","Spy Thriller","Keira Knightley and Ben Whishaw return to the stylish London spy thriller, with all new episodes at once.","Netflix"],
["The Gilded Age","Show · Season 4, Nov 1, 2026","Period Drama","Old money versus new money in 1880s New York. Agnes plots her comeback with a dinner for President Grover Cleveland (Jim Gaffigan).","HBO, HBO Max"],
["The Lord of the Rings: The Rings of Power","Show · Season 3, Nov 11, 2026","Fantasy Epic","Sauron is back with a bigger army and sets out to forge the One Ring, while Galadriel and Elrond try to unite the free peoples.","Prime Video"],
["The Body","Show · Premieres Nov 11, 2026","Supernatural Horror","After a dance-team initiation goes wrong, a group of Catholic school girls begin having prophetic visions that set off mass hysteria in their town.","Netflix"],
["The Good Daughter","Show · Premieres Nov 12, 2026","Mystery Thriller","Rose Byrne and Meghann Fahy play estranged lawyer sisters pulled back together by a brutal case, from Karin Slaughter's bestseller.","Peacock"],
["The Empress","Show · Season 3, Nov 12, 2026","Period Drama","The final season of Netflix's royal drama arrives this week.","Netflix"],
["The Chosen","Show · Season 6, Nov 15, 2026","Historical Drama","Season 6 of the faith-based series premieres on Prime Video.","Prime Video"],
["Percy Jackson and the Olympians","Show · Season 3, Nov 20, 2026","Fantasy Adventure","Season 3 of Disney+'s Percy Jackson series arrives next week.","Disney+"],
["Yellowjackets","Show · Season 4, Nov 20, 2026","Survival Thriller","The final season of the survival thriller premieres next week on Showtime.","Showtime"]]};
document.querySelectorAll('[data-row]').forEach(r=>{const s=r.dataset.row;r.innerHTML=D[s].map(([t,y,g,d,w],i)=>{const[a,b]=s==="halloween"?(i%2?["#a855f7","#1e0a33"]:["#ff7a18","#2a0f00"]):P[i%P.length];return`<article class="tile rec" style="--a:${a};--b:${b}"><div class="rec-top"><span class="rec-no">${String(i+1).padStart(2,'0')}</span><span class="rec-g">${g}</span></div><h4>${t}</h4><p class="rec-y">${y}</p><p class="rec-d">${d}</p><p class="rec-w"><span>Where to watch</span>${w}</p></article>`}).join('')});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));
