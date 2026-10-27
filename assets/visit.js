(function(){try{
var ua=navigator.userAgent||'';if(navigator.webdriver||/bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|facebookexternalhit/i.test(ua))return;
var k='ctv_vid',id;try{id=localStorage.getItem(k);if(!id){id=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36));localStorage.setItem(k,id);}}catch(e){id='';}
var ref='';try{if(document.referrer){var u=new URL(document.referrer);if(u.host!==location.host)ref=u.origin+u.pathname;}}catch(e){}
fetch('https://vrmtxrtzweblakuvkwoe.supabase.co/rest/v1/rpc/log_page_view',{method:'POST',keepalive:true,headers:{apikey:'sb_publishable_zvptRN1xVVYyt6jP1B-5vA_netcK9Vm','Content-Type':'application/json'},body:JSON.stringify({p_path:location.pathname,p_referrer:ref,p_visitor:id})}).catch(function(){});
}catch(e){}})();
