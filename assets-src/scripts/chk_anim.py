from PIL import Image, ImageSequence
import json
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'
CH=R+'public/assets/img/characters/'
PAL=set("be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split())
ok=True
def chk(name,size):
    global ok
    im=Image.open(CH+name).convert('RGBA')
    if im.size!=size: print('BAD SIZE',name,im.size); ok=False
    bad=0
    for p in im.getdata():
        if p[3] not in (0,255): bad+=1
        elif p[3]==255 and '%02x%02x%02x'%p[:3] not in PAL: bad+=1
    if bad: print('BAD PIXELS',name,bad); ok=False
    return im
def fr(im,c,r,w=32,h=38): return im.crop((c*w,r*h,c*w+w,r*h+h))
for n in range(1,5):
    a=chk('cliente-%d-anim.png'%n,(192,152))
    o=Image.open(CH+'cliente-%d.png'%n).convert('RGBA').crop((0,0,32,38))
    if list(fr(a,0,0).getdata())!=list(o.getdata()): print('F1 DIFF',n); ok=False
    for r in (0,1,2):
        for c in range(6):
            f=fr(a,c,r); bb=f.getbbox()
            if bb[3]!=38: print('FOOT',n,r,c,bb); ok=False
    # transiciones: cambio maximo entre frames consecutivos (desplazamiento del bbox)
    for r in range(4):
        for c in range(5):
            b1=fr(a,c,r).getbbox(); b2=fr(a,c+1,r).getbbox()
            d=max(abs(b1[i]-b2[i]) for i in range(4))
            if d>3: print('JUMP',n,r,c,d); ok=False
c=chk('cajero-anim.png',(128,38))
o=Image.open(CH+'cajero-izq.png').convert('RGBA')
if list(fr(c,0,0).getdata())!=list(o.getdata()): print('CAJERO F1 DIFF'); ok=False
print('TODO OK' if ok else 'FALLOS')
