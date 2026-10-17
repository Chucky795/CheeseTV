document.getElementById('yr').textContent=new Date().getFullYear();
const links=document.querySelector('.links');
document.querySelector('.burger').onclick=()=>links.classList.toggle('show');
links.querySelectorAll('a').forEach(a=>a.onclick=()=>links.classList.remove('show'));
document.querySelectorAll('.acc button').forEach(b=>b.onclick=()=>{const a=b.parentElement,p=b.nextElementSibling;
a.classList.toggle('open');p.style.maxHeight=a.classList.contains('open')?p.scrollHeight+'px':0;});
document.getElementById('form').onsubmit=e=>{e.preventDefault();e.target.querySelector('.ok').hidden=false;e.target.reset();};
const G=["#ff9f1c,#6a040f","#3a0ca3,#4cc9f0","#2d6a4f,#95d5b2","#7209b7,#f72585","#14213d,#fca311","#432818,#bb9457","#03045e,#00b4d8","#540b0e,#e09f3e","#1b263b,#778da9","#5f0f40,#fb8b24"];
const D={
movies:[["Midnight Run to Orion","🚀",["Sci-Fi","Action"],"8.4"],["The Last Lighthouse","🌊",["Drama"],"7.9"],["Laugh Track","😂",["Comedy"],"7.2"],["Whispers in the Pines","🌲",["Horror","Thriller"],"7.6"],["Golden Hour","🌅",["Romance","Drama"],"8.1"],["Iron Circuit","🤖",["Sci-Fi","Action"],"7.8"],["The Cheese Heist","🧀",["Comedy","Crime"],"8.0"],["Desert Echoes","🏜️",["Adventure"],"7.4"],["Shadow Protocol","🕶️",["Thriller","Action"],"8.2"]],
series:[["Harbor Street","⚓",["Drama","Crime"],"S3"],["Kitchen Chaos","🍳",["Reality","Comedy"],"S5"],["Starfall Academy","✨",["Fantasy","Teen"],"S2"],["The Quiet Detective","🔍",["Crime","Mystery"],"S4"],["Wild Frontiers","🦁",["Documentary"],"S1"],["Office Hours","☕",["Comedy"],"S6"],["Crown of Ash","👑",["Fantasy","Drama"],"S2"],["Neon Nights","🌃",["Thriller"],"S1"]],
ppv:[["Thunder Clash: Title Night","🥊",["Boxing"],"LIVE NOW","live"],["Cage Kings 12","🤼",["MMA"],"Sat · 9:00 PM","up"],["Grand Velocity Cup","🏎️",["Racing"],"Sun · 2:00 PM","up"],["Summer Sound Live","🎤",["Concert"],"LIVE NOW","live"],["Ringside Rumble","🥋",["Wrestling"],"Fri · 8:00 PM","up"],["Heavyweight Showdown","🏆",["Boxing"],"Nov 14 · 10:00 PM","up"]]};
Object.entries(D).forEach(([k,list])=>{const row=document.querySelector(`[data-row=${k}]`);if(k==='ppv')row.classList.add('ppv');
row.innerHTML=list.map((m,i)=>{const extra=k==='ppv'?`<span class="st ${m[4]}">${m[4]==='live'?'● LIVE':'UPCOMING'}</span><span class="when">📅 ${m[3]}</span>`:`<span class="rate">${k==='movies'?'⭐ '+m[3]:m[3]}</span>`;
return `<div class="poster" data-tags="${m[2].join(',')}"><div class="art" style="background:linear-gradient(160deg,${G[(i*3+k.length)%G.length]})">${extra}<span>${m[1]}</span></div><div class="pi"><h4>${m[0]}</h4><div class="tags">${m[2].map(t=>`<span>${t}</span>`).join('')}</div></div></div>`}).join('');
const cats=['All',...new Set(list.flatMap(m=>m[2]))].slice(0,6),ch=document.querySelector(`[data-for=${k}]`);
ch.innerHTML=cats.map((c,i)=>`<button class="chip${i?'':' on'}">${c}</button>`).join('');
ch.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{ch.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));b.classList.add('on');
row.querySelectorAll('.poster').forEach(p=>p.classList.toggle('hide',b.textContent!=='All'&&!p.dataset.tags.split(',').includes(b.textContent)))})});
document.querySelectorAll('.row-scroll').forEach(row=>{
const car=document.createElement('div');car.className='car';row.before(car);car.append(row);
const mk=(c,t,l)=>{const b=document.createElement('button');b.className='arr '+c;b.textContent=t;b.setAttribute('aria-label',l);car.append(b);return b};
const prev=mk('prev','‹','Previous'),next=mk('next','›','Next');
const dots=document.createElement('div');dots.className='dots';car.after(dots);
const pages=()=>Math.max(1,Math.ceil(row.scrollWidth/row.clientWidth-0.05));
const cur=()=>{const max=row.scrollWidth-row.clientWidth;return max<=0?0:Math.round(row.scrollLeft/max*(pages()-1))};
const go=i=>{const n=pages();i=(i+n)%n;row.scrollLeft=i*(row.scrollWidth-row.clientWidth)/Math.max(1,n-1)};
const build=()=>{dots.innerHTML='';for(let i=0;i<pages();i++){const d=document.createElement('button');d.setAttribute('aria-label','Slide '+(i+1));d.onclick=()=>go(i);dots.append(d)}upd()};
const upd=()=>{const c=cur();[...dots.children].forEach((d,i)=>d.classList.toggle('on',i===c));const one=pages()<2;prev.disabled=next.disabled=one;dots.style.visibility=one?'hidden':''};
prev.onclick=()=>go(cur()-1);next.onclick=()=>go(cur()+1);
let t;row.addEventListener('scroll',()=>{clearTimeout(t);t=setTimeout(upd,80)});
let paused=false;['mouseenter','touchstart','focusin'].forEach(e=>car.addEventListener(e,()=>paused=true,{passive:true}));
['mouseleave','focusout'].forEach(e=>car.addEventListener(e,()=>paused=false));car.addEventListener('touchend',()=>setTimeout(()=>paused=false,4000));
setInterval(()=>{if(!paused&&!document.hidden&&pages()>1)go(cur()+1)},5000);
new ResizeObserver(build).observe(row);
car.parentElement.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{row.scrollLeft=0;setTimeout(build,50)}));
});
