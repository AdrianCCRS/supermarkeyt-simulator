from PIL import Image
import json
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'
CH=R+'public/assets/img/characters/'
PAL=set("be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split())
ok=True
im=Image.open(CH+'clientes-protesta.png').convert('RGBA')
if im.size!=(192,152): print('BAD SIZE',im.size); ok=False
bad=sum(1 for p in im.getdata() if p[3] not in (0,255) or (p[3]==255 and '%02x%02x%02x'%p[:3] not in PAL))
if bad: print('BAD PIXELS',bad); ok=False
fr=lambda c,r:im.crop((c*32,r*38,c*32+32,r*38+32+6))
outl=lambda f:sum(1 for p in f.getdata() if p[3] and p[:3]==(0x18,0x14,0x25))
for n in range(1,5):
    o=Image.open(CH+'cliente-%d.png'%n).convert('RGBA').crop((0,0,32,38))
    if list(fr(0,n-1).getdata())!=list(o.getdata()): print('F1 != base',n); ok=False
    for c in range(6):
        bb=fr(c,n-1).getbbox()
        exp=37 if c in (0,2,4,5) else None
        low=bb[3]-1
        if c in (0,2,4,5) and low!=37: print('FOOT',n,c,low); ok=False
        if c in (1,3) and low not in (36,37): print('FOOT',n,c,low); ok=False
        if bb[0]<0 or bb[2]>32: print('BBOX',n,c,bb); ok=False
        # pies: cada pie baja al menos a 36
    ch=[sum(1 for a,b in zip(fr(c,n-1).getdata(),fr(c+1,n-1).getdata()) if a!=b) for c in range(5)]
    print('cliente',n,'pixeles distintos entre frames consecutivos',ch)
    if min(ch)<20: print('POCO CAMBIO',n); ok=False
# distincion: pelo/ropa
def dom(n,box):
    from collections import Counter
    f=fr(0,n-1).crop(box); return Counter(p[:3] for p in f.getdata() if p[3] and p[:3]!=(0x18,0x14,0x25)).most_common(1)[0][0]
hair=[dom(n,(9,2,23,9)) for n in range(1,5)]; cloth=[dom(n,(10,20,22,30)) for n in range(1,5)]
print('pelo',hair,'ropa',cloth)
if len(set(hair))<4 or len(set(cloth))<4: print('NO DISTINTOS'); ok=False
print(json.load(open(CH+'clientes-protesta-layout.json')))
print('TODO OK' if ok else 'HAY FALLOS')
