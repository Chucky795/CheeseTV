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
["Ebenezer: A Christmas Carol","Movie · Nov 13, 2026","Holiday Drama","Johnny Depp's Scrooge in Ti West's new take on the Dickens classic opened at No. 1 with $19 million.","In theaters (Paramount)"],
["The Cat in the Hat","Movie · Nov 6, 2026","Animated Family","Warner Bros.' animated Dr. Seuss adaptation held second place with $11.4 million in its second weekend.","In theaters (Warner Bros.)"],
["Godzilla Minus Zero","Movie · Nov 6, 2026","Kaiju Action","The follow-up to Godzilla Minus One is still in the top three after a $48.9 million first ten days.","In theaters (GKIDS)"],
["Heartland","Movie · Nov 13, 2026","Drama","Jessica Chastain plays a prickly retired country star searching for her missing niece in Nashville.","Netflix"],
["The End of Oak Street","Movie · Nov 13, 2026","Sci-Fi Adventure","David Robert Mitchell's dinosaur thriller with Ewan McGregor and Anne Hathaway, about a family trapped in a prehistoric world.","HBO Max"],
["Madden","Movie · Nov 18, 2026","Sports Biopic","Nicolas Cage is John Madden and Christian Bale is Raiders owner Al Davis, with Kathryn Hahn and Sienna Miller.","Prime Video"],
["The Hunger Games: Sunrise on the Reaping","Movie · Nov 20, 2026","Dystopian Action","Lionsgate's Hunger Games prequel following young Haymitch Abernathy in the 50th Hunger Games opens wide this week.","In theaters (Lionsgate)"],
["Steps","Movie · Nov 20, 2026","Animated Comedy","An animated twist on Cinderella, with Ali Wong, Stephanie Hsu, Amanda Seyfried and Nikki Glaser voicing.","Netflix"],
["Hexed","Movie · Nov 25, 2026","Animated Family","Disney's animated Hexed opens for Thanksgiving week.","In theaters (Disney)"]],
series:[
["The Lord of the Rings: The Rings of Power","Show · Season 3, Nov 11, 2026","Fantasy Epic","Sauron builds a bigger army while Galadriel and Elrond try to unite the free peoples. Two more episodes Nov 18; finale Nov 25.","Prime Video"],
["The Good Daughter","Show · Premiered Nov 12, 2026","Mystery Thriller","Rose Byrne and Meghann Fahy play estranged sisters pulled together by a brutal case, from Karin Slaughter's bestseller.","Peacock"],
["12 12 12","Show · Premiered Nov 13, 2026","Heist Thriller","Anthony Mackie and Jamie Dornan face off around a Zürich heist, told across three timelines in each episode.","Apple TV"],
["The Chosen","Show · Season 6, Nov 15, 2026","Historical Drama","Season 6 of the faith-based series starts with a three-episode premiere.","Prime Video"],
["Cunk on Cinema","Show · Nov 15, 2026","Comedy","Diane Morgan's Philomena Cunk tackles the history of cinema in a six-episode binge.","Netflix"],
["Win the Mall","Show · Nov 18, 2026","Reality Competition","Players compete to outshop and outlast each other in a living mall, hosted by Haley Baylee. Eight episodes at once.","Netflix"],
["The Altruists","Show · Nov 19, 2026","Drama","Anthony Boyle and Julia Garner play Sam Bankman-Fried and Caroline Ellison. Eight episodes at once.","Netflix"],
["Percy Jackson and the Olympians","Show · Season 3, Nov 20, 2026","Fantasy Adventure","Season 3 begins with a two-episode premiere.","Disney+"],
["Yellowjackets","Show · Final Season, Nov 20, 2026","Survival Thriller","The survival thriller's final season premieres.","Paramount+"]]};
document.querySelectorAll('[data-row]').forEach(r=>{const s=r.dataset.row;r.innerHTML=D[s].map(([t,y,g,d,w],i)=>{const[a,b]=s==="halloween"?(i%2?["#a855f7","#1e0a33"]:["#ff7a18","#2a0f00"]):P[i%P.length];return`<article class="tile rec" style="--a:${a};--b:${b}"><div class="rec-top"><span class="rec-no">${String(i+1).padStart(2,'0')}</span><span class="rec-g">${g}</span></div><h4>${t}</h4><p class="rec-y">${y}</p><p class="rec-d">${d}</p><p class="rec-w"><span>Where to watch</span>${w}</p></article>`}).join('')});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));
