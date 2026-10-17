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
// What's Worth Watching (text-only recommendation cards)
const P=[["#f0a500","#3a1c00"],["#4cc9f0","#0b1a4a"],["#f72585","#2b0538"],["#95d5b2","#0b2b1e"],["#ffd76a","#1b2a5a"],["#e09f3e","#3b0b0e"],["#a78bfa","#14103a"],["#fb8b24","#2a0f1e"]];
const D={movies:[
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
document.querySelectorAll('[data-row]').forEach(r=>{const s=r.dataset.row;r.innerHTML=D[s].map(([t,y,g,d,w],i)=>{const[a,b]=P[i%P.length];return`<article class="tile rec" style="--a:${a};--b:${b}"><div class="rec-top"><span class="rec-no">${String(i+1).padStart(2,'0')}</span><span class="rec-g">${g}</span></div><h4>${t}</h4><p class="rec-y">${y}</p><p class="rec-d">${d}</p><p class="rec-w"><span>Where to watch</span>${w}</p></article>`}).join('')});
