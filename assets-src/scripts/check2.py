import json,sys
from PIL import Image
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'; I=R+'public/assets/img/'; S=sys.argv[1]
PAL=set("be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split())
ok=True
def chk(n,c):
    global ok; print('OK  ' if c else 'FAIL',n); ok&=bool(c)
for f,sz in (('tienda/mostrador-caja.png',(64,214)),('tienda/mueble-trasero.png',(28,52)),('tienda/luz-carril.png',(28,32))):
    im=Image.open(I+f).convert('RGBA'); px=im.load()
    chk(f'tamano {f}',im.size==sz)
    bad=sum(1 for y in range(im.height) for x in range(im.width) if px[x,y][3] not in(0,255) or (px[x,y][3]==255 and '%02x%02x%02x'%px[x,y][:3] not in PAL))
    chk(f'paleta/alfa {f} ({bad} malos)',bad==0)
m=Image.open(I+'tienda/mostrador-caja.png').convert('RGBA').load()
chk('canal x24..55 y0..185 transparente',all(m[x,y][3]==0 for x in range(24,56) for y in range(186)))
chk('hueco escaner 262b44 (x24..55,y186..213)',all(m[x,y]==(0x26,0x2b,0x44,255) for x in range(24,56) for y in range(186,214)))
l=Image.open(I+'tienda/luz-carril.png').convert('RGBA').load()
chk('cara luz-carril 16x14 una sola 193c3e',all(l[x,y]==(0x19,0x3c,0x3e,255) for x in range(6,22) for y in range(8,22)))
# layout
j=json.load(open(I+'tienda/tienda-layout.json'))
j.pop('mostrador',None); j.pop('cartel',None); j.pop('mostrador_canal',None); j.pop('mostrador_hueco_escaner',None)
j.update({"mostrador_caja":[96,56,64,214],"mostrador_canal":[24,0,32,214],"mostrador_hueco_escaner":[24,186,32,28],"mueble_trasero":[66,168,28,52],"luz_carril":[122,34,28,32],"luz_carril_cara":[6,8,16,14],"cajero":[64,220,32,32],"planta":[10,160,16,24]})
json.dump(j,open(I+'tienda/tienda-layout.json','w'),indent=1)
def L(p): return Image.open(I+p).convert('RGBA')
c=Image.new('RGBA',(320,270),(0,0,0,255))
s=L('tienda/suelo.png')
for x in range(0,160,16):
    for y in range(0,270,16): c.alpha_composite(s,(x,y))
for p,pos in (('tienda/pared-estanterias.png',(0,0)),('tienda/cestas.png',(60,140)),('tienda/planta.png',(10,160)),('tienda/expositor.png',(56,72)),('tienda/mueble-trasero.png',(66,168)),('characters/cajero.png',(64,220)),('tienda/mostrador-caja.png',(96,56)),('tienda/luz-carril.png',(122,34))): c.alpha_composite(L(p),pos)
for i in range(4): c.alpha_composite(L(f'characters/cliente-{i+1}.png').crop((0,0,32,32)),(36,72+44*i))
b=L('banda/banda.png')
for y in range(0,118,32): c.alpha_composite(b.crop((0,0,160,min(32,118-y))),(160,y))
c.alpha_composite(L('banda/mesa.png'),(160,118)); c.alpha_composite(L('banda/escaner.png').crop((0,0,64,56)),(168,132))
c.alpha_composite(L('banda/balanza.png'),(240,132)); c.alpha_composite(L('banda/bolsa.png').crop((0,0,144,58)),(168,192)); c.alpha_composite(L('banda/boton-entregar.png').crop((0,0,96,16)),(192,252))
c.resize((960,810),0).save(S+'/columna_v2.png')
# solapes (cajas de la lista)
boxes={'cestas':(60,140,28,20),'planta':(10,160,16,24),'expositor':(56,72,44,60),'mueble':(66,168,28,52),'cajero':(64,220,32,32),'mostrador':(96,56,64,214),'luz':(122,34,28,32),'pared':(0,0,160,64)}
for i in range(4): boxes[f'cliente{i+1}']=(36,72+44*i,32,32)
ks=list(boxes)
for a in range(len(ks)):
    for b2 in range(a+1,len(ks)):
        A=boxes[ks[a]];B=boxes[ks[b2]]
        w=min(A[0]+A[2],B[0]+B[2])-max(A[0],B[0]); h=min(A[1]+A[3],B[1]+B[3])-max(A[1],B[1])
        if w>0 and h>0: print('solape',ks[a],ks[b2],w,'x',h)
print('TODO OK' if ok else 'HAY FALLOS')
