import json,glob,os,sys
from PIL import Image
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'; I=R+'public/assets/img/'; S=sys.argv[1]
PAL=set("be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split())
ok=True
def chk(n,c):
    global ok; print('OK  ' if c else 'FAIL',n); ok&=bool(c)
cat={os.path.basename(f)[:-4]:f for f in glob.glob(R+'assets-src/iconos-pack/*/*.png')}
placed=[l.split()+['n'] for l in open(S+'/out/nevera_placed.txt')]
used=[p[0] for p in placed]
nev=Image.open(I+'tienda/nevera-barrera.png').convert('RGBA'); npx=nev.load()
mos=Image.open(I+'tienda/mostrador-caja.png').convert('RGBA'); m=mos.load()
chk('tamano mostrador-caja 64x214',mos.size==(64,214)); chk('tamano nevera 24x120',nev.size==(24,120))
iconpx=set()
for n,x,y,_ in placed:
    x=int(x);y=int(y); ic=Image.open(cat[n]).convert('RGBA'); ip=ic.load()
    for j in range(16):
        for i in range(16):
            if ip[i,j][3]: iconpx.add((x+i,y+j))
for im,name,mask in ((mos,'mostrador',set()),(nev,'nevera',iconpx)):
    px=im.load(); bad=0
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a=px[x,y]
            if a not in(0,255) or (a==255 and (x,y) not in mask and '%02x%02x%02x'%(r,g,b) not in PAL): bad+=1
    chk(f'alfa/paleta {name} ({bad} malos)',bad==0)
# iconos identicos (el derecho se compara salvo lo tapado por el izquierdo)
for k,(n,x,y,_) in enumerate(placed):
    x=int(x);y=int(y); ip=Image.open(cat[n]).convert('RGBA').load()
    # tapado por otro icono dibujado despues (el de la misma balda a la izquierda)
    cover=set()
    for n2,x2,y2,_ in placed:
        if (n2,x2,y2)!=(n,str(x),str(y)) and abs(int(y2)-y)<3 and int(x2)<x:
            p2=Image.open(cat[n2]).convert('RGBA').load()
            for j in range(16):
                for i in range(16):
                    if p2[i,j][3]: cover.add((int(x2)+i,int(y2)+j))
    diff=sum(1 for j in range(16) for i in range(16) if ip[i,j][3] and (x+i,y+j) not in cover and npx[x+i,y+j]!=ip[i,j])
    chk(f'icono {n} identico (salvo tapado por el vecino)',diff==0)
chk(f'>=8 iconos distintos en nevera ({len(set(used))})',len(set(used))>=8)
chk('canal x16..47 y0..119 transparente',all(m[x,y][3]==0 for x in range(16,48) for y in range(120)))
chk('hueco x16..47 y120..147 = 262b44',all(m[x,y]==(0x26,0x2b,0x44,255) for x in range(16,48) for y in range(120,148)))
STEEL={'c0cbdc','8b9bb4','5a6988','3a4466'}
bad=[(x,y) for y in range(148,214) for x in range(0,32) if m[x,y][3] and '%02x%02x%02x'%m[x,y][:3] in STEEL]
chk(f'sin acero en el lado izquierdo (x0..31) de y148..213 ({len(bad)})',not bad)
j=json.load(open(I+'tienda/tienda-layout.json'))
j.update({"mostrador_caja":[96,56,64,214],"mostrador_canal":[16,0,32,120],"mostrador_hueco_escaner":[16,120,32,28],"nevera":[40,150,24,120],"cajero":[64,220,32,32]})
for k in ('luz_carril_cara',): pass
j['iconos_nevera']=sorted(set(used))
json.dump(j,open(I+'tienda/tienda-layout.json','w'),indent=1)
def L(p): return Image.open(I+p).convert('RGBA')
c=Image.new('RGBA',(320,270),(0,0,0,255))
s=L('tienda/suelo.png')
for x in range(0,160,16):
    for y in range(0,270,16): c.alpha_composite(s,(x,y))
for p,pos in (('tienda/pared-estanterias.png',(0,0)),('tienda/cestas.png',(60,140)),('tienda/expositor.png',(56,72)),('tienda/mueble-trasero.png',(66,168)),('tienda/nevera-barrera.png',(40,150)),('tienda/mostrador-caja.png',(96,56)),('characters/cajero.png',(64,220))): c.alpha_composite(L(p),pos)
for i in range(4): c.alpha_composite(L(f'characters/cliente-{i+1}.png').crop((0,0,32,32)),(4,72+44*i))
b=L('banda/banda.png')
for y in range(0,118,32): c.alpha_composite(b.crop((0,0,160,min(32,118-y))),(160,y))
c.alpha_composite(L('banda/mesa.png'),(160,118)); c.alpha_composite(L('banda/escaner.png').crop((0,0,64,56)),(168,132))
c.alpha_composite(L('banda/balanza.png'),(240,132)); c.alpha_composite(L('banda/bolsa.png').crop((0,0,144,58)),(168,192)); c.alpha_composite(L('banda/boton-entregar.png').crop((0,0,96,16)),(192,252))
c.resize((960,810),0).save(S+'/columna_v3.png')
boxes={'nevera':(40,150,24,120),'cajero':(64,220,32,32),'mostrador':(96,56,64,214),'mueble':(66,168,28,52),'cestas':(60,140,28,20),'expositor':(56,72,44,60)}
for i in range(4): boxes[f'cliente{i+1}']=(4,72+44*i,32,32)
ks=list(boxes)
for a in range(len(ks)):
    for b2 in range(a+1,len(ks)):
        A=boxes[ks[a]];B=boxes[ks[b2]]
        w=min(A[0]+A[2],B[0]+B[2])-max(A[0],B[0]); h=min(A[1]+A[3],B[1]+B[3])-max(A[1],B[1])
        if w>0 and h>0: print('solape',ks[a],ks[b2],w,'x',h)
print('iconos nevera:',sorted(set(used)))
print('TODO OK' if ok else 'HAY FALLOS')
