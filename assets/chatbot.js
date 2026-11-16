/* CheeseTV help chat: rule-based FAQ, no AI, no secret keys. */
(function(){
if(window.__ctvChat)return;window.__ctvChat=1;
var SB="https://vrmtxrtzweblakuvkwoe.supabase.co",KEY="sb_publishable_zvptRN1xVVYyt6jP1B-5vA_netcK9Vm";
var R="https://watchcheesetv.com/renew.html",SU="https://watchcheesetv.com/signup.html";
var FAQ=[
{k:["trial","free trial","try","test it","try it"],a:"Yes! You can request a <b>free 12-hour trial</b> on the homepage, or go straight to <a href='https://watchcheesetv.com/trial.html'>watchcheesetv.com/trial.html</a>. Enter your name and email or phone, and we'll send your trial login shortly. One trial per person."},
{k:["price","cost","how much","plan","plans","monthly","per month","connections price","cheap"],a:"Plans are month to month:<br>• 1 connection: <b>$14.99/mo</b><br>• 2 connections: <b>$19.99/mo</b><br>• 3 connections: <b>$27.99/mo</b><br>Every plan includes the full channel lineup, on-demand library, TV guide and catch-up. Setup is free. New customers can <a href='"+SU+"'>sign up here</a>."},
{k:["connection","screens","screen","at once","multiple tv","same time"],a:"A connection is one screen streaming at a time. Choose 2 or 3 connections to watch on several screens at once."},
{k:["contract","cancel","commitment","pay as you go","month to month"],a:"No contract. It's pay-as-you-go, month to month, and you can cancel anytime."},
{k:["pay","payment","zelle","send money","how do i pay"],a:"We take payment by <b>Zelle</b> to <b>cheesetv795@gmail.com</b>. Put <i>CheeseTV &lt;your username&gt;</i> in the memo. New customers: <a href='"+SU+"'>sign up here</a>. Returning customers can use the <a href='"+R+"'>Renew page</a>."},
{k:["renew","renewal","expired","extend","expire","another month"],a:"Renew here: <a href='"+R+"'>watchcheesetv.com/renew.html</a>. Enter your username, pick your connections, send the amount by Zelle to cheesetv795@gmail.com, then tap <i>I've sent the payment</i>. We renew your account once we confirm the payment."},
{k:["fire","firestick","fire stick","fire tv","android tv","downloader","google tv","shield"],a:"Fire TV / Android TV: install the <b>Downloader</b> app, open it and type <b>watchcheesetv.com/tv.apk</b>, then tap Install when it finishes."},
{k:["android phone","android","apk","samsung","phone app","tablet"],a:"Android phone: tap <a href='https://watchcheesetv.com/#download'>Download APK</a>. If Chrome asks, tap <i>Download anyway</i>, open the file from your notifications, allow installs from Chrome if asked, then tap Install."},
{k:["roku"],a:"Roku: download the Roku ZIP from the <a href='https://watchcheesetv.com/#download'>Download section</a> on a computer. On the Roku remote press Home ×3, Up ×2, Right, Left, Right, Left, Right. Turn on Developer Mode and note the IP shown, open that IP in a browser and upload the zip."},
{k:["iphone","ipad","apple","ios","safari","web player","browser","computer","laptop","pc","mac","chrome","website watch"],a:"iPhone, iPad or computer: use the Web Player at <a href='http://live.watchcheesetv.com'>live.watchcheesetv.com</a> (Chrome or Safari), sign in and start watching. On iPhone you can open watchcheesetv.com/app in Safari, tap Share, then <i>Add to Home Screen</i>. Some channels only play in the Android or Roku app because of browser security rules."},
{k:["record","recording","dvr","save show"],a:"Recording works in the <b>Android / Fire TV app</b>. The device must stay on and plugged in while it records. In the web player, recording only works while the browser tab stays open."},
{k:["device","devices","supported","work on","smart tv","console","xbox","playstation"],a:"Supported: smart TVs, streaming sticks, phones, tablets, computers and game consoles. Apps: Android / Fire TV, Roku, and the Web Player for iPhone and computers."},
{k:["internet","speed","mbps","buffer","buffering","wifi","lag","freez"],a:"We recommend at least <b>100 Mbps</b> internet for the smoothest HD and 4K streaming, especially with multiple connections."},
{k:["catch up","catch-up","replay","missed","rewind"],a:"Every plan includes catch-up with 7-day replay and the full TV guide."},
{k:["4k","hd","quality","resolution"],a:"Plans include HD and 4K streaming."},
{k:["setup","set up","sign up","start","get started","new customer","subscribe","join"],a:"Sign up here: <a href='"+SU+"'>watchcheesetv.com/signup.html</a>. Pick 1, 2 or 3 connections, pay by Zelle, and we email your login and setup steps once your payment is confirmed. Setup is free."},
{k:["contact","email","support","human","talk","person","help me"],a:"Email us at <b>cheesetv795@gmail.com</b>, or tap <i>Ask CheeseTV</i> below and we'll reply to you."}
];
var CHIPS=[["💲 Prices","How much does it cost?"],["🔄 Renew","How do I renew?"],["🔥 Fire TV","How do I install on Fire TV?"],["📺 Roku","How do I install on Roku?"],["🍏 iPhone / Web","How do I watch on iPhone?"],["⏺ Recording","Can I record shows?"],["✉️ Ask CheeseTV","__ask"]];
function norm(s){return(" "+s.toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ")+" ");}
function match(q){var t=norm(q),best=null,bs=0;FAQ.forEach(function(f){var s=0;f.k.forEach(function(k){if(t.indexOf(norm(k))>=0)s+=k.length;});if(s>bs){bs=s;best=f;}});return best;}
var css="#ctvc-b{position:fixed;right:16px;bottom:16px;z-index:10000;width:60px;height:60px;border-radius:50%;border:0;background:linear-gradient(135deg,#ffd76a,#f0a500);color:#0a1124;font-size:28px;box-shadow:0 6px 24px rgba(0,0,0,.5);cursor:pointer}"+
"#ctvc{position:fixed;right:12px;bottom:86px;z-index:10000;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 110px));display:flex;flex-direction:column;background:#0a1124;border:2px solid #f0a500;border-radius:18px;overflow:hidden;font:15px/1.45 system-ui,-apple-system,sans-serif;color:#e8ecf6;box-shadow:0 10px 40px rgba(0,0,0,.6)}#ctvc[hidden]{display:none}"+
"#ctvc header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:linear-gradient(135deg,#ffd76a,#f0a500);color:#0a1124;font-weight:800}#ctvc header button{background:none;border:0;font-size:22px;color:#0a1124;cursor:pointer}"+
"#ctvc .m{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}#ctvc .b{max-width:85%;padding:9px 12px;border-radius:14px;background:#0f1a36;border:1px solid #1d2b55}#ctvc .u{align-self:flex-end;background:#f0a500;color:#0a1124;border:0}#ctvc a{color:#ffd76a}"+
"#ctvc .c{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;border-top:1px solid #1d2b55}#ctvc .c button{background:#050913;color:#ffd76a;border:1px solid #f0a500;border-radius:999px;padding:6px 11px;font-size:13px;cursor:pointer}"+
"#ctvc form.i{display:flex;gap:6px;padding:10px 12px;border-top:1px solid #1d2b55}#ctvc input,#ctvc textarea{flex:1;width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;border:1px solid #1d2b55;background:#060c1c;color:#e8ecf6;font-size:16px;font-family:inherit}"+
"#ctvc .go{background:linear-gradient(135deg,#ffd76a,#f0a500);color:#0a1124;border:0;border-radius:12px;padding:0 14px;font-weight:800;cursor:pointer}#ctvc .f{display:flex;flex-direction:column;gap:6px}#ctvc .f .go{padding:10px}#ctvc .ok{color:#7dffa8}#ctvc .err{color:#ff7a7a}";
var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
var btn=document.createElement("button");btn.id="ctvc-b";btn.setAttribute("aria-label","Chat with CheeseTV");btn.textContent="💬";
var w=document.createElement("div");w.id="ctvc";w.hidden=true;
w.innerHTML="<header><span>🧀 CheeseTV Help</span><button aria-label='Close'>×</button></header><div class='m'></div><div class='c'></div><form class='i'><input placeholder='Type your question…' maxlength='300' aria-label='Your question'><button class='go'>Send</button></form>";
document.body.appendChild(w);document.body.appendChild(btn);
if(document.getElementById("fab")){btn.style.bottom="92px";w.style.bottom="162px";w.style.height="min(520px,calc(100vh - 180px))";}
var M=w.querySelector(".m"),C=w.querySelector(".c"),F=w.querySelector("form.i"),I=F.querySelector("input");
function add(h,u){var d=document.createElement("div");d.className="b"+(u?" u":"");if(u)d.textContent=h;else d.innerHTML=h;M.appendChild(d);M.scrollTop=M.scrollHeight;return d;}
CHIPS.forEach(function(c){var b=document.createElement("button");b.type="button";b.textContent=c[0];b.onclick=function(){if(c[1]=="__ask"){add(c[0],1);askForm("");}else ask(c[1]);};C.appendChild(b);});
function ask(q){add(q,1);var f=match(q);setTimeout(function(){if(f)add(f.a+"<br><small>Still need help? Tap ✉️ Ask CheeseTV.</small>");else{add("Sorry, I don't have an answer for that one. Send your question to CheeseTV and we'll get back to you.");askForm(q);}},250);}
function esc(s){return s.replace(/[&<>"']/g,function(c){return"&#"+c.charCodeAt(0)+";";});}
function askForm(q){var d=add("<form class='f'><b>Send your question to CheeseTV</b><input name='n' placeholder='Your name' maxlength='80' required><input name='c' placeholder='Phone or email' maxlength='120' required><textarea name='q' rows='3' maxlength='1000' placeholder='Your question' required>"+esc(q)+"</textarea><button class='go'>Send to CheeseTV</button><div class='s'></div></form>");
var f=d.querySelector("form"),s=f.querySelector(".s");f.onsubmit=function(e){e.preventDefault();var n=f.n.value.trim(),c=f.c.value.trim(),qq=f.q.value.trim();
if(n.length<2||c.length<5||qq.length<3){s.className="s err";s.textContent="Please fill in your name, a phone or email, and your question.";return;}
var b=f.querySelector("button");b.disabled=true;s.className="s";s.textContent="Sending…";
fetch(SB+"/rest/v1/rpc/submit_question",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify({p_name:n,p_contact:c,p_question:qq,p_page:location.pathname})})
.then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.message||"Error");return j;});})
.then(function(){s.className="s ok";s.textContent="✓ Sent! CheeseTV will reply to you soon.";f.querySelectorAll("input,textarea,button").forEach(function(x){x.disabled=true;});})
.catch(function(er){b.disabled=false;s.className="s err";s.textContent=(/Too many/.test(er.message)?"Too many messages, please try again later.":"Couldn't send. Please email cheesetv795@gmail.com.");});};}
F.onsubmit=function(e){e.preventDefault();var q=I.value.trim();if(!q)return;I.value="";ask(q);};
var greeted=0;function open(o){w.hidden=!o;btn.textContent=o?"×":"💬";if(o&&!greeted){greeted=1;add("Hi! 👋 I'm the CheeseTV helper. Ask about prices, renewing, payment, or installing the app, or tap a button below.");}}
btn.onclick=function(){open(w.hidden);};w.querySelector("header button").onclick=function(){open(false);};
window.ctvChat={open:open,ask:function(q){open(true);ask(q);}};
})();
