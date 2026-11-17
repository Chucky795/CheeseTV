"""v35: Multi-view is gone and single-channel playback still works. Local static app + local HLS fixture; every
other request is aborted (never a real provider). Usage: python3 tests/single-play-browser.py /path/to/hls-fixture"""
import asyncio,json,pathlib,sys,http.server,threading,functools
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];HLS=pathlib.Path(sys.argv[1]);PORT=8097
OUT=pathlib.Path('/workspace/builds/remove-multiview');OUT.mkdir(parents=True,exist_ok=True)
def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*a):pass
    http.server.ThreadingHTTPServer(('127.0.0.1',PORT),functools.partial(Q,directory=str(ROOT))).serve_forever()
threading.Thread(target=serve,daemon=True).start()
B=f'http://127.0.0.1:{PORT}'
async def run(pw,name,ctx_opts):
    b=await pw.chromium.launch(channel='chrome');ctx=await b.new_context(service_workers='block',**ctx_opts)
    async def route(r):
        u=r.request.url;hdr={'access-control-allow-origin':'*'}
        if u.startswith(B+'/live/'):
            p=u.split('?')[0]
            for v in ('low','high'):
                if f'/{v}/' in p:
                    f=HLS/v/p.rsplit('/',1)[1];return await r.fulfill(status=200,headers=hdr,body=f.read_bytes(),content_type='application/vnd.apple.mpegurl' if f.suffix=='.m3u8' else 'video/mp2t')
            return await r.fulfill(status=200,headers=hdr,body=(HLS/'master.m3u8').read_bytes(),content_type='application/vnd.apple.mpegurl')
        if u.startswith(B+'/'):return await r.continue_()
        await r.abort()
    await ctx.route('**/*',route)
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto(B+'/app/',wait_until='domcontentloaded');await page.wait_for_function("typeof S!=='undefined'&&typeof playChannel==='function'")
    await page.evaluate(f"""S.pls=[{{id:'mock',type:'xt',server:'{B}',user:'demo',pass:'demo123',name:'Mock'}}];S.active='mock';
      S.chans=[1,2,3,4].map(i=>({{id:'x'+i,n:i,name:'Mock Channel '+i,group:'Mock',url:'{B}/live/demo/demo123/'+i+'.m3u8',alt:'{B}/live/demo/demo123/'+i+'.ts'}}));
      document.querySelector('#signin').hidden=true;document.querySelector('#shell').hidden=false;render()""")
    await page.wait_for_timeout(800)
    body=(await page.inner_text('body')).lower()
    gone={'btnMv':await page.locator('#btnMv').count(),'mv_global':await page.evaluate("typeof window.MV"),'multiview.js':await page.evaluate("[...document.scripts].some(s=>/multiview/.test(s.src))"),
          'text':[t for t in ('multi-view','multiview','split screen') if t in body]}
    await page.screenshot(path=str(OUT/f'web-{name}-home.png'))
    await page.evaluate("playChannel(0,S.chans)")
    await page.wait_for_function("(()=>{const v=document.querySelector('#video');return v&&v.currentTime>1.5})()",timeout=30000)
    t=await page.evaluate("document.querySelector('#video').currentTime")
    await page.screenshot(path=str(OUT/f'web-{name}-playing.png'))
    print(name,'multiview gone:',gone,'| playing, currentTime',round(t,1),'| errors',errors)
    assert gone['btnMv']==0 and gone['mv_global']=='undefined' and not gone['multiview.js'] and not gone['text'] and not errors
    await b.close()
async def main():
    async with async_playwright() as pw:
        await run(pw,'desktop',{'viewport':{'width':1366,'height':860}})
        await run(pw,'phone',{'viewport':{'width':390,'height':844},'is_mobile':True,'has_touch':True,'device_scale_factor':2})
asyncio.run(main())
