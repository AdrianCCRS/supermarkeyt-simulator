import json,sys
from PIL import Image
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/public/assets/img/ranking/'
PAL=set("be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split())
SZ={'panel-ranking.png':(160,120),'ranking-vacio.png':(160,120),'ranking-fila-tu.png':(144,16),'ranking-corona.png':(13,9)}
bad=[]
def hx(p): return '%02x%02x%02x'%p[:3]
ims={}
for n,sz in SZ.items():
    im=Image.open(R+n).convert('RGBA'); ims[n]=im
    if im.size!=sz: bad.append((n,'size',im.size))
    for y in range(im.height):
        for x in range(im.width):
            p=im.getpixel((x,y))
            if p[3] not in(0,255): bad.append((n,'alpha',x,y))
            elif p[3]==255 and hx(p) not in PAL: bad.append((n,'pal',x,y,hx(p)))
    # pixeles sueltos: opacos sin ningun vecino 4-conexo del mismo color
    for y in range(im.height):
        for x in range(im.width):
            p=im.getpixel((x,y))
            if p[3]==0: continue
            ok=False
            for dx,dy in((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                a,b=x+dx,y+dy
                if 0<=a<im.width and 0<=b<im.height and im.getpixel((a,b))==p: ok=True
            if not ok: bad.append((n,'suelto',x,y,hx(p)))
L=json.load(open(R+'ranking-layout.json'))
def flat(im,r):
    x,y,w,h=r; cs={im.getpixel((i,j)) for i in range(x,x+w) for j in range(y,y+h)}
    return len(cs)==1
P=ims['panel-ranking.png']
for r in [L['titulo']]+[f[k] for f in L['filas'] for k in('posicion','apodo','puntos')]:
    if not flat(P,r): bad.append(('panel','zona no lisa',r))
V=ims['ranking-vacio.png']
for k in('titulo','mensaje'):
    if not flat(V,L['vacio'][k]): bad.append(('vacio','zona no lisa',k))
T=ims['ranking-fila-tu.png']
for k in('posicion','apodo','puntos'):
    if not flat(T,L['fila_tu'][k]): bad.append(('tu','zona no lisa',k))
print('TODO OK' if not bad else bad[:40])
