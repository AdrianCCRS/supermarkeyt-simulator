from PIL import Image
import json
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'
PAL=set("be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split())
bad=[]
def px(im): return list(im.getdata())
for f,sz in(('libro-flechas.png',(72,12)),('libro-numero.png',(30,12))):
    im=Image.open(R+'public/assets/img/caja/'+f).convert('RGBA')
    if im.size!=sz: bad.append((f,'tam',im.size))
    for p in px(im):
        if p[3] not in(0,255): bad.append((f,'alfa',p))
        if p[3] and '%02x%02x%02x'%p[:3] not in PAL: bad.append((f,'pal',p))
sh=Image.open(R+'public/assets/img/caja/libro-flechas.png').convert('RGBA')
fr=[sh.crop((i*12,0,i*12+12,12)) for i in range(6)]
d=[px(f) for f in fr]
if len({tuple(x) for x in d})!=6: bad.append('frames repetidos')
# espejo del triangulo: pixeles de color flecha
def arrow(f,col):
    return {(x,y) for y in range(12) for x in range(12) if f.getpixel((x,y))[:3]==col and f.getpixel((x,y))[3]}
for a,b in((0,3),(1,4),(2,5)):
    c=(0x26,0x5c,0x42) if a!=1 else (0xa2,0x26,0x33)
    A=arrow(fr[a],c);B=arrow(fr[b],c)
    if {(11-x-0,y) for x,y in A}!={(x,y) for x,y in B}:
        # espejo en caja 11 (normal) o desplazada (pulsada)
        off=1 if a==2 else 0
        m={(10+2*off-x,y) for x,y in A}
        if m!={(x,y) for x,y in B}: bad.append(('espejo',a,b))
# zona lisa placa
pl=Image.open(R+'public/assets/img/caja/libro-numero.png').convert('RGBA')
z={pl.getpixel((x,y)) for x in range(2,28) for y in range(2,10)}
if z!={(0x19,0x3c,0x3e,255)}: bad.append(('zona',z))
j=json.load(open(R+'public/assets/img/caja/libro-flechas-layout.json'))
if len(j['flechas']['frames'])!=6: bad.append('json')
print('TODO OK' if not bad else bad)
