from PIL import Image
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'
PAL=set(l for l in "be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split())
bad=[]
def frames(p,n):
    im=Image.open(R+p).convert('RGBA'); return im,[im.crop((32*i,0,32*i+32,38)) for i in range(n)]
a,_=frames('public/assets/img/characters/cajero-izq.png',1)
b,fr=frames('public/assets/img/characters/cajero-anim.png',4)
if a.size!=(32,38): bad.append('izq size')
if b.size!=(128,38): bad.append('anim size')
for nm,im in (('izq',a),('anim',b)):
    for y in range(im.height):
        for x in range(im.width):
            p=im.getpixel((x,y))
            if p[3] not in (0,255): bad.append(f'{nm} alfa {x},{y}')
            elif p[3]==255 and '%02x%02x%02x'%p[:3] not in PAL: bad.append(f'{nm} paleta {x},{y}')
if list(a.getdata())!=list(fr[0].getdata()): bad.append('frame1 != izq')
K=(0x18,0x14,0x25,255)
ks=[]
for i,f in enumerate(fr):
    ks.append(sum(1 for p in f.getdata() if p==K))
    ys=[y for y in range(38) for x in range(32) if f.getpixel((x,y))[3]==255]
    feet=[x for x in range(32) if f.getpixel((x,37))[3]==255]
    if max(ys)!=37 or not feet: bad.append(f'pies frame {i}')
print('contorno por frame',ks)
if abs(ks[1]-ks[0])>3 or abs(ks[2]-ks[0])>3: bad.append('contorno >3 vs frame 1: %s'%ks)  # frame 4 suma los billetes (original: +16)
print('TODO OK' if not bad else bad[:20])
