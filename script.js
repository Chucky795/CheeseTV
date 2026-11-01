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
["You Can See Everything","Movie · Wide Oct 23, 2026","Documentary","Nathan Fielder and Lance Oppenheim's three-hour Elizabeth Holmes documentary edged out Clayface for No. 1 this Halloween weekend, now past $63M.","In theaters (A24)"],
["Clayface","Movie · Oct 23, 2026","DC Horror","A vain Hollywood actor's face, and life, start melting away in this R-rated Batman-villain spinoff. A close No. 2 this weekend.","In theaters (Warner Bros.)"],
["Wildwood","Movie · Oct 23, 2026","Stop-Motion Animation","Laika's gorgeous new stop-motion adventure from director Travis Knight, with an A CinemaScore and rave reviews.","In theaters (Fathom)"],
["Wicker","Movie · Oct 23, 2026","Period Comedy","Olivia Colman orders herself a husband made of wicker, played by Alexander Skarsgård. Cheeky, romantic and a word-of-mouth hit.","In theaters (Black Bear)"],
["Verity","Movie · On demand now","Psychological Thriller","Dakota Johnson finishes a famous author's book series and finds a disturbing manuscript. Anne Hathaway and Josh Hartnett co-star in this steamy Colleen Hoover adaptation.","Digital rent or buy"],
["Scream 7","Movie · Streaming now","Slasher Horror","Neve Campbell's Sidney Prescott is pulled out of hiding when a new Ghostface goes after her daughter.","Prime Video"],
["Minions & Monsters","Movie · Oct 28, 2026","Animated Comedy","The Minions are 1920s silent-film stars who accidentally unleash monsters on Los Angeles. Family movie night, sorted.","Peacock"],
["Godzilla Minus Zero","Movie · Nov 6, 2026","Kaiju Action","The follow-up to the Oscar-winning Godzilla Minus One, with Ryunosuke Kamiki and Minami Hamabe back. Early reviews are over 90% on Rotten Tomatoes.","In theaters (GKIDS)"],
["The Cat in the Hat","Movie · Nov 6, 2026","Animated Family","Warner Bros.' animated take on the Dr. Seuss classic, with Bill Hader, Xochitl Gomez and Quinta Brunson in the voice cast.","In theaters (Warner Bros.)"],
["Ebenezer: A Christmas Carol","Movie · Nov 13, 2026","Holiday Drama","Johnny Depp plays Scrooge in director Ti West's new take on the Dickens classic.","In theaters (Paramount)"],
["How to Rob a Bank","Movie · Nov 13, 2026","Action Heist","Nicholas Hoult and Zoë Kravitz pull off viral bank heists in David Leitch's R-rated thriller, with Pete Davidson and John C. Reilly.","In theaters"]],
series:[
["Nocturne","Show · Premiered Oct 30, 2026","Crime Thriller","Liev Schreiber plays an ex-soldier turned detective hunting a ruthless serial killer (Stephen Graham), with Zazie Beetz as an FBI agent.","Apple TV"],
["Dexter: Resurrection","Show · Season 2, Oct 30, 2026","Crime Drama","America's favorite serial killer is back for another season of dark secrets and close calls.","Paramount+"],
["The Gilded Age","Show · Season 4, Nov 1, 2026","Period Drama","Old money versus new money in 1880s New York. Agnes plots her comeback with a dinner for President Grover Cleveland (Jim Gaffigan).","HBO, HBO Max"],
["The Greatest","Show · Premieres Nov 4, 2026","Biopic Drama","Jaalen Best stars as Cassius Clay and Muhammad Ali in the first authorized scripted series about the champ.","Prime Video"],
["Stick","Show · Season 2, Nov 4, 2026","Sports Comedy","Owen Wilson's washed-up golfer takes another swing at his own career and sets his sights on the U.S. Open.","Apple TV"],
["Black Doves","Show · Season 2, Nov 5, 2026","Spy Thriller","Keira Knightley and Ben Whishaw return to the stylish London spy thriller, with all new episodes at once.","Netflix"],
["The Institute","Show · Season 2, Nov 8, 2026","Sci-Fi Thriller","The escaped psychic kids fight to keep the Institute dead as a tech billionaire (Alfie Allen) helps rebuild it. The story now goes beyond Stephen King's book.","MGM+"],
["VisionQuest","Show · New episodes weekly","Superhero Drama","Hunted and haunted by Ultron, Vision has to figure out what he really is. The series finale lands Nov 10.","Disney+"],
["The Lord of the Rings: The Rings of Power","Show · Season 3, Nov 11, 2026","Fantasy Epic","Sauron is back with a bigger army and sets out to forge the One Ring, while Galadriel and Elrond try to unite the free peoples.","Prime Video"],
["The Good Daughter","Show · Premieres Nov 12, 2026","Mystery Thriller","Rose Byrne and Meghann Fahy play estranged lawyer sisters pulled back together by a brutal case, from Karin Slaughter's bestseller.","Peacock"]]};
document.querySelectorAll('[data-row]').forEach(r=>{const s=r.dataset.row;r.innerHTML=D[s].map(([t,y,g,d,w],i)=>{const[a,b]=s==="halloween"?(i%2?["#a855f7","#1e0a33"]:["#ff7a18","#2a0f00"]):P[i%P.length];return`<article class="tile rec" style="--a:${a};--b:${b}"><div class="rec-top"><span class="rec-no">${String(i+1).padStart(2,'0')}</span><span class="rec-g">${g}</span></div><h4>${t}</h4><p class="rec-y">${y}</p><p class="rec-d">${d}</p><p class="rec-w"><span>Where to watch</span>${w}</p></article>`}).join('')});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));
