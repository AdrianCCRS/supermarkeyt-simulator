from PIL import Image, ImageDraw
import sys
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'
H=R+'public/assets/img/hud/'
PAL="be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split()
P={tuple(int(h[i:i+2],16) for i in (0,2,4)) for h in PAL}
bad=[]
def ld(n,size):
    im=Image.open(H+n).convert('RGBA')
    if im.size!=size: bad.append(f'{n} tamaño {im.size}')
    px=im.load(); 
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a=px[x,y]
            if a not in(0,255): bad.append(f'{n} alfa {x},{y}');return im
            if a and (r,g,b) not in P: bad.append(f'{n} color {x},{y} {(r,g,b)}');return im
    return im
def solid(im,n,r,col=None):
    x,y,w,h=r; s={im.getpixel((i,j)) for i in range(x,x+w) for j in range(y,y+h)}
    if len(s)!=1 or (col and list(s)[0][:3]!=col): bad.append(f'{n} zona {r} no lisa {s}')
bar=ld('hud-barra.png',(480,24))
if bar.getextrema()[3][0]!=255: bad.append('barra con transparencia')
S=[[18,4,84,16],[108,4,60,16],[174,4,60,16],[240,4,60,16],[306,4,90,16]]
for s in S: solid(bar,'slot',s,(0x19,0x3c,0x3e))
solid(bar,'boton',[408,4,68,16],(0x26,0x2b,0x44)); solid(bar,'lampara',[6,8,8,8],(0x26,0x2b,0x44))
b=ld('hud-boton.png',(408,16))
for i in range(6): solid(b,f'boton{i}',[i*68+3,3,62,10])
cols=[b.getpixel((i*68+30,8))[:3] for i in range(6)]; print('colores boton',cols)
l=ld('hud-lampara.png',(24,8)); ic=ld('hud-iconos.png',(40,10)); pn=ld('panel-cierre.png',(224,168))
solid(pn,'titulo',[6,6,212,11]); solid(pn,'cuerpo',[6,22,212,140])
for i in range(3): 
    if sum(1 for y in range(8) for x in range(8) if l.getpixel((i*8+x,y))[3])<30: bad.append('lampara pobre')
for i in range(4):
    n=sum(1 for y in range(10) for x in range(10) if ic.getpixel((i*10+x,y))[3]); print('icono',i,'px',n)
for im,n in((bar,'barra'),(b,'boton'),(l,'lampara'),(ic,'iconos'),(pn,'panel')):
    pass
import os
bad+= [f'falta {p}' for p in (R+'assets-src/hud.aseprite',) if not os.path.exists(p)]
# previews
pv=R+'assets-src/previews/'
z=bar.resize((1920,96),Image.NEAREST); d=ImageDraw.Draw(z)
for k,s in enumerate(S+[[408,4,68,16],[6,8,8,8]]):
    d.rectangle([s[0]*4,s[1]*4,(s[0]+s[2])*4-1,(s[1]+s[3])*4-1],outline=(255,0,255) if k<5 else (0,255,255))
bg=Image.new('RGBA',(1920,96),(60,60,60,255)); bg.alpha_composite(z); bg.convert('RGB').save(pv+'hud-barra-x4.png')
c=Image.new('RGBA',(480,24+8+16+8+16+8+10),(90,120,90,255))
c.alpha_composite(bar,(0,0)); c.alpha_composite(b,(0,32)); c.alpha_composite(l,(0,56)); c.alpha_composite(ic,(40,56))
c.resize((c.width*3,c.height*3),Image.NEAREST).convert('RGB').save(pv+'hud-piezas-x3.png')
bg=Image.new('RGBA',(224,168),(90,120,90,255)); bg.alpha_composite(pn); bg.resize((672,504),Image.NEAREST).convert('RGB').save(pv+'panel-cierre-x3.png')
for p in('hud-barra-x4.png','hud-piezas-x3.png','panel-cierre-x3.png'):
    if not os.path.exists(pv+p): bad.append('falta preview '+p)
print('TODO OK' if not bad else bad)
