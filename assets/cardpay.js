/* CheeseTV card checkout (PayMeGate hosted checkout). Public product links only: no API key here.
   Card, Apple Pay, Google Pay, PayPal, Cash App and Venmo are handled on PayMeGate's page.
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
/* Records who is paying (so the payment alert can show the username for renewals), then opens checkout.
   If saving fails we still open checkout: the payment alert then shows the email only. */
async function start(o){
 const kind=o.kind==='renewal'?'renewal':'new',n=+o.connections;
 let ref=null;
 try{const r=await fetch(SB+'/rest/v1/rpc/start_card_checkout',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},
   body:JSON.stringify({p_kind:kind,p_connections:n,p_email:o.email,p_name:o.name||null,p_phone:o.phone||null,p_device:o.device||null,p_username:o.username||null})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||'save failed');ref=j.id}
 catch(e){if(o.strict)throw e}
 try{localStorage.setItem('ctv_checkout',JSON.stringify({kind,n,email:o.email,username:o.username||null,ref,t:Date.now()}))}catch(e){}
 w.location.href=url(kind,n,o.email,o.checkoutName||o.name);
}
w.CardPay={LINKS,PRICE,url,start};
})(window);
