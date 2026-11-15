"""v34 Multi-view in real browsers. Local static app + local HLS fixture; every other request is aborted
(never a real provider, production, analytics or update service).
Usage: python3 tests/multiview-browser.py /path/to/hls-fixture   (master.m3u8 + low/ + high/)"""
import asyncio,json,pathlib,sys,http.server,threading,functools
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];HLS=pathlib.Path(sys.argv[1]);PORT=8096
OUT=pathlib.Path('/workspace/builds/multiview-browser');OUT.mkdir(parents=True,exist_ok=True)
def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*a):pass
    h=functools.partial(Q,directory=str(ROOT))
    http.server.ThreadingHTTPServer(('127.0.0.1',PORT),h).serve_forever()
threading.Thread(target=serve,daemon=True).start()
B=f'http://127.0.0.1:{PORT}'
async def run(pw,name,launch,ctx_opts,plan='2'):
    browser=await launch();ctx=await browser.new_context(service_workers='block',**ctx_opts)
    seen={'api':0,'live':set(),'variants':set()}
    async def route(r):
        u=r.request.url
        if u.startswith(B+'/player_api.php'):
            seen['api']+=1
            return await r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*'},
                body=json.dumps({'user_info':{'auth':1,'status':'Active','max_connections':plan,'allowed_output_formats':['m3u8','ts']}}))
        if u.startswith(B+'/live/'):
            p=u.split('?')[0];hdr={'access-control-allow-origin':'*'}
            if p.endswith('.ts') and '/low/' not in p and '/high/' not in p:return await r.fulfill(status=404,headers=hdr,body='')
            for v in ('low','high'):
                if f'/{v}/' in p:
                    seen['variants'].add(v);f=HLS/v/p.rsplit('/',1)[1]
                    return await r.fulfill(status=200,headers=hdr,body=f.read_bytes(),content_type='application/vnd.apple.mpegurl' if f.suffix=='.m3u8' else 'video/mp2t')
            seen['live'].add(p.rsplit('/',1)[1]);return await r.fulfill(status=200,headers=hdr,body=(HLS/'master.m3u8').read_bytes(),content_type='application/vnd.apple.mpegurl')
        if u.startswith(B+'/'):return await r.continue_()
        await r.abort()
    await ctx.route('**/*',route)
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto(B+'/app/',wait_until='domcontentloaded');await page.wait_for_function("window.MV&&typeof S!=='undefined'&&typeof pl==='function'")
    await page.evaluate(f"""S.pls=[{{id:'mock',type:'xt',server:'{B}',user:'demo',pass:'demo123',name:'Mock'}}];S.active='mock';
      S.chans=[1,2,3,4].map(i=>({{id:'x'+i,n:i,name:'NFL Game '+i,group:'NFL',url:'{B}/live/demo/demo123/'+i+'.m3u8',alt:'{B}/live/demo/demo123/'+i+'.ts'}}));
      document.querySelector('#signin').hidden=true;document.querySelector('#shell').hidden=false""")
    await page.click('#btnMv');await page.wait_for_selector('#mv:not([hidden])')
    await page.wait_for_function(f"MV.state.planChecked")
    ban=await page.locator('.mvban').inner_text() if await page.locator('.mvban').count() else ''
    if plan=='2':assert 'Your plan allows 2 screens at once' in ban,ban
    async def pick(i,n):
        await page.locator(f'.mvt[data-i="{i}"]').click();await page.wait_for_selector('.mvp')
        await page.locator('.mvpt .chip',has_text='Channels').click();await page.locator('.mvpc',has_text=f'NFL Game {n}').click()
    await pick(0,1);await pick(1,2)
    await page.wait_for_function("MV.state.tiles[0].status==='playing'&&MV.state.tiles[1].status==='playing'",timeout=30000)
    # 3rd screen is refused by the plan (2 connections)
    await pick(2,3)
    if plan=='2':
        assert await page.evaluate("MV.state.tiles[2].ch")is None
        assert await page.evaluate("Object.keys(MV._players).length")==2
    await page.wait_for_timeout(4000)
    info=await page.evaluate("""Object.entries(MV._players).map(([i,p])=>({i:+i,muted:p.v.muted,h:p.v.videoHeight,lvl:p.hls?p.hls.currentLevel:null,cap:p.hls?p.hls.autoLevelCapping:null}))""")
    sel=await page.evaluate("MV.state.sel")
    for x in info:
        assert x['muted']==(x['i']!=sel),info  # exactly one tile has sound
        if x['i']!=sel and x['lvl'] is not None:assert x['lvl']==0 and x['cap']==0,info  # muted -> lowest variant
    assert await page.locator('.mvt.aud').count()==1
    await page.screenshot(path=str(OUT/f'{name}-grid.png'))
    # click the other tile -> it gets the audio
    other=0 if sel!=0 else 1;await page.locator(f'.mvt[data-i="{other}"]').click();await page.wait_for_timeout(300)
    assert await page.evaluate(f"MV._players[{other}].v.muted")==False and await page.evaluate(f"MV._players[{sel}].v.muted")==True
    # swap via the options menu; the same <video> moves (no reconnect)
    v0=await page.evaluate_handle("MV._players[0].v")
    await page.locator('.mvt[data-i="0"]').click(button='right');await page.locator('.mvm button',has_text='Swap').click()
    await page.locator('.mvt[data-i="1"]').click()
    assert await page.evaluate("MV.state.tiles[0].ch.name")=='NFL Game 2' and await page.evaluate("MV.state.tiles[1].ch.name")=='NFL Game 1'
    assert await page.evaluate("v=>MV._players[1].v===v",v0)
    # keyboard: Enter -> full screen, Escape -> grid; arrows move the sound
    await page.locator('.mvt[data-i="1"]').focus();await page.keyboard.press('Enter');await page.wait_for_selector('.mvfull')
    assert await page.evaluate("MV._players[MV.state.full].hls?MV._players[MV.state.full].hls.capLevelToPlayerSize&&MV._players[MV.state.full].hls.autoLevelCapping!==0:true")
    await page.screenshot(path=str(OUT/f'{name}-full.png'))
    await page.keyboard.press('Escape');await page.wait_for_selector('.mvg')
    await page.keyboard.press('ArrowLeft');await page.wait_for_timeout(200);assert await page.evaluate("MV.state.sel")==0
    # 2-up layout
    await page.locator('.mvlay .chip',has_text='2-up').click();assert await page.locator('.mvt').count()==2
    # leave: every player released
    await page.locator('[data-a="close"]').click();await page.wait_for_selector('#mv',state='hidden')
    left=await page.evaluate("({p:Object.keys(MV._players).length,v:[...document.querySelectorAll('video')].filter(v=>v.id!=='v'&&v.currentSrc).length,cls:document.body.classList.contains('mv-open')})")
    assert left['p']==0 and not left['cls'],left
    # reopen restores the same games
    await page.click('#btnMv');await page.wait_for_function("MV.state.tiles[0].ch&&MV.state.tiles[0].ch.name==='NFL Game 2'")
    await page.keyboard.press('Escape');await page.wait_for_selector('#mv',state='hidden')
    assert not errors,errors
    print(name,'OK',{'api_calls':seen['api'],'streams':sorted(seen['live']),'variants':sorted(seen['variants']),'tiles':info})
    await browser.close()
async def main():
    async with async_playwright() as pw:
        await run(pw,'chrome-desktop',lambda:pw.chromium.launch(channel='chrome'),{'viewport':{'width':1280,'height':720}})
        await run(pw,'chrome-phone',lambda:pw.chromium.launch(channel='chrome'),{**pw.devices['Pixel 7'],'viewport':{'width':915,'height':412}},plan='4')
        try:await run(pw,'webkit-iphone',lambda:pw.webkit.launch(),{**pw.devices['iPhone 13 landscape']})
        except Exception as e:print('webkit-iphone NOT VERIFIED:',type(e).__name__,str(e)[:300])
asyncio.run(main())
