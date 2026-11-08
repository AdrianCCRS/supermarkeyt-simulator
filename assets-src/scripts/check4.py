import json,sys
from PIL import Image
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'; I=R+'public/assets/img/'; S=sys.argv[1]
PAL=set("be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split())
ok=True
def chk(n,c):
    global ok; print('OK  ' if c else 'FAIL',n); ok&=bool(c)
F={'tienda/mostrador-caja.png':(64,214),'tienda/mini-escaner.png':(48,28),'tienda/mini-balanza.png':(20,18),'tienda/mini-caja.png':(28,28),'tienda/luz-carril.png':(24,28),'characters/cajero-izq.png':(32,32)}
img={}
for f,sz in F.items():
    im=Image.open(I+f).convert('RGBA'); img[f]=im; px=im.load()
    chk(f'tamano {f} {im.size}',im.size==sz)
    bad=sum(1 for y in range(im.height) for x in range(im.width) if px[x,y][3] not in(0,255) or (px[x,y][3]==255 and '%02x%02x%02x'%px[x,y][:3] not in PAL))
    chk(f'alfa/paleta {f} ({bad})',bad==0)
m=img['tienda/mostrador-caja.png'].load()
chk('canal x20..43 y0..87 transparente',all(m[x,y][3]==0 for x in range(20,44) for y in range(88)))
chk('hueco x20..43 y88..115 = 262b44',all(m[x,y]==(0x26,0x2b,0x44,255) for x in range(20,44) for y in range(88,116)))
WOOD={'e4a672','b86f50','ead4aa'}
def only(x0,y0,x1,y1): return all('%02x%02x%02x'%m[x,y][:3] in WOOD for x in range(x0,x1+1) for y in range(y0,y1+1))
chk('rect caja x34..61 y120..147 solo madera',only(34,120,61,147))
chk('rect balanza x4..25 y124..143 solo madera',only(4,124,25,143))
def uni(f,box,c):
    p=img[f].load(); return all('%02x%02x%02x'%p[x,y][:3]==c and p[x,y][3]==255 for x in range(box[0],box[0]+box[2]) for y in range(box[1],box[1]+box[3]))
chk('pantalla mini-balanza 12x4 (4,2) 193c3e',uni('tienda/mini-balanza.png',(4,2,12,4),'193c3e'))
chk('pantalla mini-caja 14x5 (7,2) 193c3e',uni('tienda/mini-caja.png',(7,2,14,5),'193c3e'))
chk('cara luz-carril 14x12 (5,6) 193c3e',uni('tienda/luz-carril.png',(5,6,14,12),'193c3e'))
chk('mini-escaner frames distintos',img['tienda/mini-escaner.png'].crop((0,0,24,28)).tobytes()!=img['tienda/mini-escaner.png'].crop((24,0,48,28)).tobytes())
j=json.load(open(I+'tienda/tienda-layout.json'))
for k in ('mostrador','cartel','nevera','iconos_nevera','luz_carril_cara','cajero','mostrador_caja'): j.pop(k,None)
j.update({"mostrador_caja":[60,56,64,214],"mostrador_canal":[20,0,24,88],"mostrador_hueco_escaner":[20,88,24,28],"mini_escaner":[80,144,24,28,2],"mini_balanza":[64,180,20,18],"mini_balanza_pantalla":[4,2,12,4],"mini_caja":[94,176,28,28],"mini_caja_pantalla":[7,2,14,5],"luz_carril":[80,36,24,28],"luz_carril_cara":[5,6,14,12],"cajero_izq":[124,148,32,32],"mueble_trasero":[130,100,28,52]})
json.dump(j,open(I+'tienda/tienda-layout.json','w'),indent=1)
def L(p): return Image.open(I+p).convert('RGBA')
c=Image.new('RGBA',(320,270),(0,0,0,255))
s=L('tienda/suelo.png')
for x in range(0,160,16):
    for y in range(0,270,16): c.alpha_composite(s,(x,y))
c.alpha_composite(L('tienda/pared-estanterias.png'),(0,0))
# fondo del canal / hueco como lo pintara el juego (banda), para ver el encaje
c.alpha_composite(L('tienda/mueble-trasero.png'),(130,100))
c.alpha_composite(L('tienda/mostrador-caja.png'),(60,56))
c.alpha_composite(img['tienda/mini-escaner.png'].crop((0,0,24,28)),(80,144))
for p,pos in (('tienda/mini-balanza.png',(64,180)),('tienda/mini-caja.png',(94,176)),('tienda/luz-carril.png',(80,36)),('characters/cajero-izq.png',(124,148))): c.alpha_composite(L(p),pos)
for i in range(4): c.alpha_composite(L(f'characters/cliente-{i+1}.png').crop((0,0,32,32)),(8,76+42*i))
b=L('banda/banda.png')
for y in range(0,118,32): c.alpha_composite(b.crop((0,0,160,min(32,118-y))),(160,y))
c.alpha_composite(L('banda/mesa.png'),(160,118)); c.alpha_composite(L('banda/escaner.png').crop((0,0,64,56)),(168,132))
c.alpha_composite(L('banda/balanza.png'),(240,132)); c.alpha_composite(L('banda/bolsa.png').crop((0,0,144,58)),(168,192)); c.alpha_composite(L('banda/boton-entregar.png').crop((0,0,96,16)),(192,252))
c.resize((960,810),0).save(S+'/columna_v4.png')
# comparativas
k=Image.open(I+'caja/caja-cuerpo.png').convert('RGBA'); bz=Image.open(I+'banda/balanza.png').convert('RGBA'); esc=Image.open(I+'banda/escaner.png').convert('RGBA').crop((0,0,64,56))
cmp=Image.new('RGBA',(144+8+28+8+72+8+20+8+64+8+24,151),(238,238,238,255))
x=0
for im in (k,img['tienda/mini-caja.png'],bz,img['tienda/mini-balanza.png'],esc,img['tienda/mini-escaner.png'].crop((0,0,24,28))):
    cmp.alpha_composite(im,(x,0)); x+=im.width+8
cmp.resize((cmp.width*3,cmp.height*3),0).save(S+'/comparativa.png')
print('TODO OK' if ok else 'HAY FALLOS')
