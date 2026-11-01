/* CheeseTV Christmas theme */
(function(){
var d=document;
if(!sessionStorage.getItem('xmasBannerClosed')){var b=d.createElement('div');b.id='xmas-banner';b.innerHTML='🎄 <b>Merry Christmas</b> from CheeseTV! 🎅';var x=d.createElement('button');x.setAttribute('aria-label','Close');x.textContent='×';x.onclick=function(){b.remove();sessionStorage.setItem('xmasBannerClosed','1')};b.appendChild(x);d.body.insertBefore(b,d.body.firstChild);}
var nav=d.querySelector('header.nav');if(nav){var l=d.createElement('div');l.className='xmas-lights';l.setAttribute('aria-hidden','true');l.innerHTML=new Array(25).join('<i></i>');nav.appendChild(l);}
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var c=d.createElement('canvas');c.id='xmas-snow';c.setAttribute('aria-hidden','true');d.body.appendChild(c);
var g=c.getContext('2d'),w,h,f=[],n=innerWidth<700?35:70;
function rs(){w=c.width=innerWidth;h=c.height=innerHeight}rs();addEventListener('resize',rs);
for(var i=0;i<n;i++)f.push({x:Math.random()*w,y:Math.random()*h,r:1+Math.random()*2.5,s:.3+Math.random()*.9,o:Math.random()*6});
(function t(){g.clearRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.8)';for(var i=0;i<n;i++){var p=f[i];p.y+=p.s;p.o+=.01;p.x+=Math.sin(p.o)*.4;if(p.y>h){p.y=-5;p.x=Math.random()*w}g.beginPath();g.arc(p.x,p.y,p.r,0,6.3);g.fill()}if(!d.hidden)requestAnimationFrame(t);else setTimeout(t,500)})();
})();
