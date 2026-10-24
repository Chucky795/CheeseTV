import sys; sys.argv=['x']
src=open('/workspace/promo/ads/statics.py').read().split("O='/workspace/promo/ads/'")[0]
exec(src)
from PIL import ImageDraw
logo=Image.open('/workspace/cheesetv-logo-512.png').convert('RGBA')
def stripe(im,y,h,t,s):
    d=ImageDraw.Draw(im); d.polygon([(0,y+10),(im.width,y-10),(im.width,y+h-10),(0,y+h+10)],fill=G)
    d.text((im.width//2,y+h//2),t,font=f(s),fill=(0,0,0),anchor="mm")
def make(W,H,out):
    im=bg(W,H,W*.7,H*.55); sq=H==1080
    lg(im,40,30,200 if sq else 230)
    x0=270 if sq else 300
    txt(im,(x0,95 if sq else 110),"ALL YOUR TV.",100 if sq else 110,anchor="lm")
    txt(im,(x0,195 if sq else 220),"ONE CHEESY APP.",88 if sq else 96,G,"lm")
    py=280 if sq else 320
    ph=phone(im,'v20-All.png',W-430,py,370,(0,0,1071,1650 if sq else 1900))
    by=py+40 if sq else py+40; gp=64 if sq else 72
    items=["Live TV Guide","Movies & Series","Record shows","Unlimited favorites","Continue watching","   on any screen"]
    d=ImageDraw.Draw(im)
    for i,t in enumerate(items):
        y=by+i*gp
        if not t.startswith(' '): d.ellipse((50,y-14,78,y+14),fill=G)
        d.text((96,y),t.strip(),font=f(56 if sq else 60),fill=(255,255,255),anchor="lm",stroke_width=3,stroke_fill=(0,0,0))
    dy=by+5*gp+50
    devs=["Android phone","Android TV / Google TV","Fire TV  •  Roku  •  Web"]
    d.text((50,dy),"WORKS ON:",font=f(48),fill=G,anchor="lm")
    for i,t in enumerate(devs):
        d.text((70,dy+52+i*46),t,font=f(44),fill=(255,255,255),anchor="lm")
    sy=H-232 if sq else H-300
    stripe(im,sy,90 if sq else 110,"MESSAGE ME TO GET SET UP!",70 if sq else 84)
    btn(im,W//2,H-80 if sq else H-95,"watchcheesetv.com",72 if sq else 84,300 if sq else 340)
    im.convert('RGB').save(out,quality=92)
make(1080,1080,'/workspace/promo/offerup/cheesetv-offerup-square.jpg')
make(1080,1350,'/workspace/promo/offerup/cheesetv-offerup-portrait.jpg')
