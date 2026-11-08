import json,glob,os,sys
from PIL import Image
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'
I=R+'public/assets/img/'
S=sys.argv[1]
PAL={ '%s'%h for h in "be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split()}
cat={}
for f in glob.glob(R+'assets-src/iconos-pack/*/*.png'): cat[os.path.basename(f)[:-4]]=f
ok=True
def chk(name,c):
    global ok
    print(('OK  ' if c else 'FAIL'),name); ok&=bool(c)
sizes={'tienda/suelo.png':(16,16),'tienda/pared-estanterias.png':(160,64),'tienda/expositor.png':(44,60),'tienda/mostrador.png':(56,214),'characters/cajero.png':(32,32),
 'tienda/cestas.png':(28,20),'tienda/planta.png':(16,24),'tienda/cartel-caja.png':(48,16)}
for i in range(1,5): sizes[f'characters/cliente-{i}.png']=(128,32)
for n in 'lac-002 car-001 car-002 car-003 des-001 des-002 des-003 beb-001 lim-001 lim-002 hig-001'.split(): sizes[f'icons/{n}.png']=(16,16)
for k,v in sizes.items():
    im=Image.open(I+k).convert('RGBA'); chk(f'tamano {k} {im.size}',im.size==v)
# paleta + alfa; (en piezas con iconos del pack se enmascaran los pixeles de iconos)
placed={}
for fn,piece in (('pared_placed.txt','tienda/pared-estanterias.png'),('expo_placed.txt','tienda/expositor.png')):
    for l in open(S+'/out/'+fn):
        n,x,y=l.split(); placed.setdefault(piece,[]).append((n,int(x),int(y)))
used=[]
for k in sizes:
    im=Image.open(I+k).convert('RGBA'); px=im.load(); w,h=im.size
    mask=set()
    # pared/expositor: las posiciones de la pared son relativas a su pieza; las del expositor ya llevan offset (56,72)
    for (n,x,y) in placed.get(k,[]):
        ic=Image.open(cat[n]).convert('RGBA'); ip=ic.load()
        ox=x-(56 if 'expositor' in k else 0); oy=y-(72 if 'expositor' in k else 0)
        same=True
        for j in range(16):
            for i in range(16):
                X,Y=ox+i,oy+j
                if ip[i,j][3]>0:
                    mask.add((X,Y))
                    if not(0<=X<w and 0<=Y<h) or px[X,Y]!=ip[i,j]: same=False
        chk(f'icono identico {n} en {k}',same)
        used.append(n)
    bad=0;badalpha=0
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if a not in (0,255): badalpha+=1
            elif a==255 and (x,y) not in mask and '%02x%02x%02x'%(r,g,b) not in PAL: bad+=1
    chk(f'paleta/alfa {k} (fuera de paleta {bad}, alfa parcial {badalpha})',bad==0 and badalpha==0)
# tiras de clientes: 4 frames, mismos pies y=31
for i in range(1,5):
    im=Image.open(I+f'characters/cliente-{i}.png').convert('RGBA')
    fr=[im.crop((32*k,0,32*k+32,32)) for k in range(4)]
    feet=[max(y for y in range(32) for x in range(32) if f.getpixel((x,y))[3]) for f in fr]
    chk(f'cliente-{i}: 4 frames de 32x32, pies y={feet}',all(f==31 for f in feet))
    chk(f'cliente-{i}: los 4 frames se diferencian',len({f.tobytes() for f in fr})==4)
# suelo 4x4
s=Image.open(I+'tienda/suelo.png').convert('RGBA'); t=Image.new('RGBA',(64,64))
for x in range(4):
    for y in range(4): t.paste(s,(x*16,y*16))
# costura: columna/fila de union comparada con interior
t.resize((256,256),0).save(S+'/suelo4.png')
chk('suelo periodico (junta) 16px',all(t.getpixel((x,y))==t.getpixel((x+16,y)) and t.getpixel((x,y))==t.getpixel((x,y+16)) for x in range(48) for y in range(48)))
# layout json
lay={"suelo":[16,16],"pared":[0,0,160,64],"expositor":[56,72,44,60],"mostrador":[104,56,56,214],"mostrador_canal":[12,0,32,214],"mostrador_hueco_escaner":[12,186,32,28],"cajero":[56,220,32,32],"cliente":[32,32,4],"cestas":[60,140,28,20],"planta":[86,160,16,24],"cartel":[108,40,48,16]}
lay["iconos_usados"]=sorted(set(used))
json.dump(lay,open(I+'tienda/tienda-layout.json','w'),indent=1)
print('iconos distintos usados:',len(set(used)),'colocados:',len(used))
print('TODO OK' if ok else 'HAY FALLOS')
