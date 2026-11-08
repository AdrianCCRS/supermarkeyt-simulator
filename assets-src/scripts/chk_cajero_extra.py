# Comprobacion de public/assets/img/characters/cajero-extra.png (+ layout, previews)
import json
from PIL import Image
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'
PAL=set("be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split())
bad=[]
im=Image.open(R+'public/assets/img/characters/cajero-extra.png').convert('RGBA')
if im.size!=(192,190): bad.append('tamano %s'%(im.size,))
lay=json.load(open(R+'public/assets/img/characters/cajero-extra-layout.json'))
K=(0x18,0x14,0x25,255)
base=Image.open(R+'public/assets/img/characters/cajero-izq.png').convert('RGBA')
JUMP={(3,1):1,(3,2):2,(3,3):1}   # (fila,frame)->px sobre el suelo
for p in im.getdata():
    if p[3] not in (0,255): bad.append('alfa'); break
    if p[3]==255 and '%02x%02x%02x'%p[:3] not in PAL: bad.append('paleta %s'%(p,)); break
for e in lay:
    r=e['fila']; n=e['frames']; ks=[]
    for c in range(6):
        f=im.crop((32*c,38*r,32*c+32,38*r+38)); op=[p for p in f.getdata() if p[3]]
        if c>=n:
            if op: bad.append(f'fila {r} col {c} deberia estar vacio')
            continue
        if not op: bad.append(f'fila {r} col {c} vacio'); continue
        ys=[y for y in range(38) for x in range(32) if f.getpixel((x,y))[3]]
        # fondo del sprite
        bottom=max(ys)
        exp=37-JUMP.get((r,c),0)
        if bottom!=exp: bad.append(f'pies fila {r} frame {c}: {bottom} != {exp}')
        ks.append(sum(1 for p in f.getdata() if p==K))
        # pixeles sueltos (sin vecino 8-conectado)
        for y in range(38):
            for x in range(32):
                if f.getpixel((x,y))[3]:
                    if not any(f.getpixel((x+i,y+j))[3] for i in(-1,0,1) for j in(-1,0,1) if (i or j) and 0<=x+i<32 and 0<=y+j<38): bad.append(f'suelto {r},{c},{x},{y}')
    d=[ks[i+1]-ks[i] for i in range(len(ks)-1)]+[ks[0]-ks[-1]]
    print(e['nombre'],'frames',n,'contorno',ks,'delta(cíclico)',d)
    for i,v in enumerate(d):
        if abs(v)>3: print('   >3 entre frame',i+1,'y',(i+1)%n+1,':',v)
if list(im.crop((0,0,32,38)).getdata())!=list(base.getdata()): bad.append('frame 1 reposo != cajero-izq')
print('TODO OK' if not bad else bad[:20])
