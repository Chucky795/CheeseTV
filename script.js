document.getElementById('yr').textContent=new Date().getFullYear();
const links=document.querySelector('.links');
document.querySelector('.burger').onclick=()=>links.classList.toggle('show');
links.querySelectorAll('a').forEach(a=>a.onclick=()=>links.classList.remove('show'));
document.querySelectorAll('.acc button').forEach(b=>b.onclick=()=>{const a=b.parentElement,p=b.nextElementSibling;a.classList.toggle('open');p.style.maxHeight=a.classList.contains('open')?p.scrollHeight+'px':0;});
document.getElementById('form').onsubmit=e=>{e.preventDefault();e.target.querySelector('.ok').hidden=false;e.target.reset();};
// TV guide
const times=["7:00 PM","7:30 PM","8:00 PM","8:30 PM","9:00 PM","9:30 PM"],NOW=2;
const CH=[["CN","Cheese News",["Evening Report","Market Wrap","Cheese News Tonight","World Desk","Late Briefing","Headline Hour"]],
["GS1","Gouda Sports 1",["Pre-Game Live","Pre-Game Live","Championship Night","Championship Night","Post-Game Show","Highlights"]],
["GS2","Gouda Sports 2",["Golf Classics","Fight Night Prelims","Fight Night Prelims","Racing Weekly","Tennis Gold","Goal Rush"]],
["BRI","Brie Cinema",["The Last Lighthouse","The Last Lighthouse","Midnight Run to Orion","Midnight Run to Orion","Golden Hour","Golden Hour"]],
["CHD","Cheddar Kids",["Toon Town","Little Explorers","Mouse Patrol","Mouse Patrol","Dino Friends","Bedtime Tales"]],
["MZ","Mozz Movies",["Iron Circuit","Iron Circuit","Shadow Protocol","Shadow Protocol","Desert Echoes","Desert Echoes"]],
["SWS","Swiss Docs",["Wild Alps","Ocean Deep","Planet Pantry","Ancient Cities","Ancient Cities","Night Sky"]],
["PRM","Parmesan Prime",["Kitchen Chaos","Harbor Street","Harbor Street","The Quiet Detective","Starfall Academy","Starfall Academy"]]];
const g=document.getElementById('guideGrid');
let h='<div class="g-row g-head"><div>Channel</div>'+times.map((t,i)=>`<div class="${i==NOW?'now-col':''}">${t}${i==NOW?' · NOW':''}</div>`).join('')+'</div>';
CH.forEach(([c,n,p])=>{h+=`<div class="g-row"><div class="ch"><i>${c}</i>${n}</div>`+p.map((x,i)=>`<div class="prog ${i==NOW?'now':''}"><b>${x}</b><small>${times[i]}</small></div>`).join('')+'</div>'});
g.innerHTML=h;
// rows
const P=[["#f0a500","#3a1c00"],["#4cc9f0","#0b1a4a"],["#f72585","#2b0538"],["#95d5b2","#0b2b1e"],["#ffd76a","#1b2a5a"],["#e09f3e","#3b0b0e"],["#a78bfa","#14103a"],["#fb8b24","#2a0f1e"],["#00b4d8","#03045e"],["#ff6b6b","#2a0a0a"]];
const D={movies:[["Midnight Run to Orion","Sci-Fi · Action"],["The Last Lighthouse","Drama"],["Laugh Track","Comedy"],["Whispers in the Pines","Horror"],["Golden Hour","Romance"],["Iron Circuit","Sci-Fi"],["The Cheese Heist","Comedy · Crime"],["Desert Echoes","Adventure"],["Shadow Protocol","Thriller"]],
series:[["Harbor Street","Drama · S3"],["Kitchen Chaos","Reality · S5"],["Starfall Academy","Fantasy · S2"],["The Quiet Detective","Mystery · S4"],["Frontier Line","Western · S1"],["Code Blue Bay","Medical · S6"],["Neon District","Sci-Fi · S2"],["Royal Rind","Period Drama · S3"]]};
const art=(i,s)=>{const[a,b]=P[i%P.length];const k=s+i;return`<svg viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="t${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="200" height="300" fill="url(#t${k})"/><circle cx="${50+(i*37)%110}" cy="${70+(i*23)%60}" r="${40+(i*13)%30}" fill="#fff" opacity=".14"/><path d="M0 ${200+(i*17)%40} Q100 ${150+(i*11)%40} 200 ${210-(i*7)%30} V300 H0Z" fill="#000" opacity=".3"/></svg>`};
document.querySelectorAll('[data-row]').forEach(r=>{const s=r.dataset.row;r.innerHTML=D[s].map(([t,m],i)=>`<div class="tile">${art(i,s)}<div class="meta"><h4>${t}</h4><p>${m}</p></div></div>`).join('')});
