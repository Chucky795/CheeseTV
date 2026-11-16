/* CheeseTV card checkout (PayMeGate). Orders are created server-side (paymegate-checkout); product links are the fallback. No API key here.
   Card (Stripe) is the only method we promote; it is handled on PayMeGate's page.
   Prices are fixed on PayMeGate (price override disabled), so the link can't be used to pay less. */
(function(w){
'use strict';
const BASE='https://www.paymegate.com/checkout/';
const LINKS={
 new:{1:'4e4df175-d0ad-498b-8b35-91ebe69d8778',2:'486b0630-cb41-4251-a1a7-43f7f1cbf4e9',3:'f8945a6f-74cb-46c3-8440-27c700bcb6d1'},
 renewal:{1:'21a8bb68-f799-47f1-b242-2e272a265f4a',2:'b3976fbc-7244-4fac-ada2-cff0e4834c58',3:'d76a41e2-4801-49f8-adab-0b4e18329b88'}
};
const PRICE={1:'14.99',2:'19.99',3:'27.99'};
const SB='https://vrmtxrtzweblakuvkwoe.supabase.co',KEY='sb_publishable_zvptRN1xVVYyt6jP1B-5vA_netcK9Vm';
function url(kind,n,email,name){const id=(LINKS[kind]||{})[n];if(!id)throw new Error('Unknown plan');
 const q=new URLSearchParams();if(email)q.set('email',email);if(name)q.set('name',name);const s=q.toString();return BASE+id+(s?'?'+s:'')}
/* CheeseTV-branded confirmation before leaving for the payment partner (PayMeGate). */
const CSS='.cpm{position:fixed;inset:0;z-index:2147483600;background:rgba(3,7,18,.82);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:1.2rem .8rem}'+
'.cpm-box{position:relative;width:100%;max-width:520px;margin:auto;background:linear-gradient(180deg,#14213d,#0b1328);border:2px solid #f0a500;border-radius:22px;padding:1.4rem 1.3rem 1.2rem;color:#eef2ff;box-shadow:0 30px 80px rgba(0,0,0,.6);font-size:.95rem;line-height:1.55}'+
'.cpm-lights{height:10px;margin:-1.4rem -1.3rem 1rem;border-radius:20px 20px 0 0;background:repeating-linear-gradient(90deg,#e11d48 0 14px,#16a34a 14px 28px,#facc15 28px 42px);opacity:.9}'+
'.cpm-head{display:flex;align-items:center;gap:.9rem}.cpm-head img{width:72px;height:auto;border-radius:14px;flex:none}.cpm-head h3{margin:0;font-size:1.25rem}.cpm-head p{margin:.1rem 0 0;color:#ffd76a;font-weight:600;font-size:.88rem}'+
'.cpm-sum{margin:1rem 0;background:#060c1c;border:1px solid rgba(255,215,106,.25);border-radius:14px;padding:.8rem 1rem}.cpm-row{display:flex;justify-content:space-between;gap:1rem;padding:.2rem 0}.cpm-row span{color:#a9b4d0}.cpm-row b{text-align:right;word-break:break-all}.cpm-price b{color:#f0a500;font-size:1.25rem}'+
'.cpm-fee{color:#a9b4d0;font-size:.8rem;margin-top:.2rem}.cpm h4{margin:.9rem 0 .4rem;font-size:1rem;color:#ffd76a}.cpm ul{margin:0;padding-left:1.15rem}.cpm li{margin:.3rem 0}.cpm .tip{background:rgba(240,165,0,.12);border-left:3px solid #f0a500;padding:.55rem .75rem;border-radius:8px;margin:.8rem 0}'+
'.cpm-btns{display:grid;gap:.6rem;margin-top:1.1rem}.cpm-btns button{font:inherit;font-weight:800;border-radius:999px;padding:.95rem 1rem;cursor:pointer;border:2px solid transparent}.cpm-go{background:linear-gradient(135deg,#ffd76a,#f0a500);color:#0a1124}.cpm-back{background:transparent;color:#eef2ff;border-color:rgba(255,215,106,.5)!important}'+
'.cpm-foot{text-align:center;color:#a9b4d0;font-size:.8rem;margin-top:.8rem}.cpm-foot a{color:#ffd76a}.cpm-x{position:absolute;top:.9rem;right:1rem;background:none;border:0;color:#a9b4d0;font-size:1.4rem;cursor:pointer}';
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function confirmBox(o){return new Promise(res=>{
 if(!document.getElementById('cpm-css')){const st=document.createElement('style');st.id='cpm-css';st.textContent=CSS;document.head.appendChild(st)}
 const n=+o.connections,renew=o.kind==='renewal',price=PRICE[n];
 const el=document.createElement('div');el.className='cpm';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','cpm-t');
 el.innerHTML='<div class="cpm-box"><div class="cpm-lights"></div><button class="cpm-x" aria-label="Close" data-a="no">&times;</button>'+
 '<div class="cpm-head"><img src="/assets/logo-365.png" alt="CheeseTV"><div><h3 id="cpm-t">Confirm your CheeseTV '+(renew?'renewal':'order')+'</h3><p>🎄 Secure card checkout</p></div></div>'+
 '<div class="cpm-sum">'+
  '<div class="cpm-row"><span>Plan</span><b>'+n+' connection'+(n>1?'s':'')+' · 1 month'+(renew?' (renewal)':'')+'</b></div>'+
  (renew&&o.username?'<div class="cpm-row"><span>Username</span><b>'+esc(o.username)+'</b></div>':'')+
  '<div class="cpm-row"><span>Email</span><b>'+esc(o.email)+'</b></div>'+
  '<div class="cpm-row cpm-price"><span>Price</span><b>$'+price+'</b></div>'+
  '<div class="cpm-fee">Your total may show about $'+(Math.ceil(+price)).toFixed(2)+' including a small processing fee.</div></div>'+
 '<h4>How card payment works</h4><ul>'+
  '<li>Your payment is handled by our secure payment partner, <b>PayMeGate</b>. The money goes to CheeseTV.</li>'+
  '<li>On the next page, pick <b>Stripe (Credit Card)</b>. That\'s the method we recommend.</li>'+
  '<li>You may see <b>Stripe / Link</b> or a screen that says you\'re <b>buying a small amount of crypto</b>. That\'s normal: it\'s how your card payment reaches CheeseTV. You don\'t need any crypto knowledge or your own wallet. It\'s all set up for you.</li>'+
  '<li>After paying, come back to <b>watchcheesetv.com</b>. '+(renew?'We extend your existing login within <b>1–3 hours</b>. No new login needed.':'We email your login within <b>1–3 hours</b>.')+'</li></ul>'+
 '<p class="tip">Card payments are a one-time payment for one month (not a subscription) and are final, with no refunds. Not sure yet? Try the <a href="/trial.html" style="color:#ffd76a">free 12-hour trial</a> first.</p>'+
 '<div class="cpm-btns"><button class="cpm-go" data-a="yes">Continue to secure payment</button><button class="cpm-back" data-a="no">Go back</button></div>'+
 '<p class="cpm-foot">Questions? <a href="mailto:cheesetv795@gmail.com">cheesetv795@gmail.com</a> · <a href="/#contact">Contact form</a> · Prefer Zelle? Pick Zelle on this page instead.</p></div>';
 const prev=document.activeElement,done=v=>{document.removeEventListener('keydown',key);el.remove();document.body.style.overflow='';if(prev&&prev.focus)prev.focus();res(v)};
 const key=e=>{if(e.key==='Escape')done(false)};
 el.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(a)done(a.dataset.a==='yes');else if(e.target===el)done(false)});
 document.addEventListener('keydown',key);document.body.appendChild(el);document.body.style.overflow='hidden';el.querySelector('.cpm-go').focus({preventScroll:true});el.scrollTop=0;
})}
/* Shows the CheeseTV confirmation, then asks our server (paymegate-checkout) to create a PayMeGate order: that page
   shows the CheeseTV logo badge and a "Return to Cheese TV" link. The server also records who is paying (so the alert
   shows the username for renewals). If the server can't create the order we fall back to the public product link.
   Resolves false if the customer goes back. */
async function start(o){
 if(o.confirm!==false&&!(await confirmBox(o)))return false;
 const kind=o.kind==='renewal'?'renewal':'new',n=+o.connections;
 const save=ref=>{try{localStorage.setItem('ctv_checkout',JSON.stringify({kind,n,email:o.email,username:o.username||null,ref,t:Date.now()}))}catch(e){}};
 let ref=null,j=null;
 try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),40000);
  const r=await fetch(SB+'/functions/v1/paymegate-checkout',{method:'POST',signal:ac.signal,headers:{apikey:KEY,'Content-Type':'application/json'},
   body:JSON.stringify({kind,connections:n,email:o.email,name:o.name||null,phone:o.phone||null,device:o.device||null,username:o.username||null})});
  clearTimeout(tm);j=await r.json().catch(()=>null);
  if(r.ok&&j&&/^https:\/\/www\.paymegate\.com\/pay\/[0-9a-f-]{36}$/.test(j.url||'')){save(j.id);w.location.href=j.url;return true}
  if(j&&j.id)ref=j.id;
  else if(r.status===400&&j&&j.error&&o.strict)throw new Error(j.error);
 }catch(e){if(o.strict)throw e}
 if(ref==null){
  try{const r=await fetch(SB+'/rest/v1/rpc/start_card_checkout',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},
    body:JSON.stringify({p_kind:kind,p_connections:n,p_email:o.email,p_name:o.name||null,p_phone:o.phone||null,p_device:o.device||null,p_username:o.username||null})});
   const k=await r.json().catch(()=>({}));if(!r.ok)throw new Error(k.message||'save failed');ref=k.id}
  catch(e){if(o.strict)throw e}
 }
 save(ref);
 w.location.href=url(kind,n,o.email,o.checkoutName||o.name);
 return true;
}
w.CardPay={LINKS,PRICE,url,start,confirmBox};
})(window);
