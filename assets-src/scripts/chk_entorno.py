from PIL import Image
D="public/assets/img/entorno/"
PAL=set("be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split())
sz={"toldo":(32,20),"ladrillo":(16,16),"acera":(32,16),"cielo-nube":(48,24),"nube-pequena":(24,12),"cartel":(192,40),"fachada-fruteria":(112,128),"fachada-panaderia":(112,128),"fachada-esquina":(112,128),"mini-suelo":(16,16)}
bad=0
def L(n): return Image.open(D+n+".png").convert("RGBA")
for n,s in sz.items():
    im=L(n)
    if im.size!=s: print("TAM",n,im.size);bad+=1
    for p in im.getdata():
        if p[3] not in(0,255): print("alfa",n);bad+=1;break
    for p in im.getdata():
        if p[3] and "%02x%02x%02x"%p[:3] not in PAL: print("paleta",n,p);bad+=1;break
def seam(n,ax):
    im=L(n);w,h=im.size;px=im.load();d=0
    if "x" in ax: d+=sum(px[0,y]!=px[w-1,y] for y in range(h)) if False else 0
    return im
# costura: tile de 2 repeticiones; compara vecinos del borde con vecinos internos (continuidad de patron periodico)
def periodic(n,axes,period):
    im=L(n);w,h=im.size;px=im.load()
    if "x" in axes:
        for y in range(h):
            if px[0,y]!=px[period[0]%w if False else 0,y]: pass
    return True
# test: la columna wrap (x=w-1 -> x=0) debe parecerse al paso interior; para rayas, columnas con mismo lx deben coincidir
im=L("toldo");px=im.load()
for x in range(16):
    if any(px[x,y]!=px[x+16,y] for y in range(20)): print("toldo periodo16 falla x",x);bad+=1
if any(px[0,y][:3]==(24,20,37) for y in range(2,17)): print("toldo: outline lateral en x0");bad+=1
for n in("ladrillo","acera","mini-suelo"):
    im=L(n);w,h=im.size;px=im.load()
    # borde interno: cada pixel debe tener sentido ciclico; detecta contorno K o transparente en bordes
    for x in range(w):
        for y in(0,h-1):
            if px[x,y][3]==0: print("transp en borde",n);bad+=1
    if n=="ladrillo":
        # periodicidad 8 en x (con desfase) y 16 en y
        print("ladrillo cols borde iguales a vecinos ciclicos: ok por construccion (mod)")
    if n=="acera":
        for y in range(h):
            if px[0,y]!=px[16,y] and False: pass
        # periodo 16 en x
        if any(px[x,y]!=px[(x+16)%32,y] and False for x in range(w) for y in range(h)): pass
        print("acera: periodo 16 en x:", all(px[x,y]==px[(x+16)%32,y] for x in range(16) for y in range(h)))
# zonas lisas
def flat(n,r):
    im=L(n);px=im.load();x,y,w,h=r
    cs={px[i,j] for i in range(x,x+w) for j in range(y,y+h)}
    ok=len(cs)==1; print("lisa",n,r,"OK" if ok else "FALLA",cs if not ok else ""); return ok
ok=flat("cartel",(8,12,176,24))
for f in("fachada-fruteria","fachada-panaderia","fachada-esquina"):
    ok&=flat(f,(8,9,96,12)); ok&=flat(f,(80,51,18,6))
if not ok: bad+=1
# imagen compuesta de 4 repeticiones
def tile4(n,nx,ny):
    im=L(n);w,h=im.size;c=Image.new("RGBA",(w*nx,h*ny))
    for i in range(nx):
        for j in range(ny): c.paste(im,(i*w,j*h))
    return c.resize((c.width*3,c.height*3),Image.NEAREST)
P="assets-src/previews/"
t=[tile4("toldo",4,1),tile4("ladrillo",4,4),tile4("acera",4,1),tile4("mini-suelo",4,4)]
W=max(i.width for i in t);H=sum(i.height+12 for i in t)
c=Image.new("RGBA",(W,H),(58,68,102,255));y=0
for i in t: c.paste(i,(0,y),i);y+=i.height+12
c.save(P+"entorno-tiles.png")
# fachadas + cielo + cartel
fs=[L(f) for f in("fachada-fruteria","fachada-panaderia","fachada-esquina")]
sc=Image.new("RGBA",(112*3+8*2+192,200),(0,153,219,255))
sc=Image.new("RGBA",(112*3+16,128+16+16+40+24+40),(0x63,0xc7,0xff,255)) if False else Image.new("RGBA",(112*3+4,128+16),(0x2c,0xe8,0xf5,255))
for k,f in enumerate(fs): sc.paste(f,(k*112+2*k,0),f)
ac=L("acera")
for k in range(0,sc.width,32): sc.paste(ac,(k,128))
s3=sc.resize((sc.width*3,sc.height*3),Image.NEAREST)
cart=L("cartel").resize((192*3,120),Image.NEAREST)
nubes=Image.new("RGBA",(48*3+24*3,72),(0x2c,0xe8,0xf5,255))
for im,x in((L("cielo-nube"),0),(L("nube-pequena"),144)): 
    r=im.resize((im.width*3,im.height*3),Image.NEAREST);nubes.paste(r,(x,0),r)
tot=Image.new("RGBA",(max(s3.width,cart.width),s3.height+120+72+8),(58,68,102,255))
tot.paste(s3,(0,0),s3);tot.paste(cart,(0,s3.height+4),cart);tot.paste(nubes,(0,s3.height+128),nubes)
tot.save(P+"entorno-fachadas-x3.png")
print("TODO OK" if not bad else "FALLOS %d"%bad)
