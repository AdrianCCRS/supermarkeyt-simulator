from PIL import Image
D="public/assets/img/entorno/"
pal={tuple(int(h[i:i+2],16) for i in (0,2,4)) for h in "be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569".split()}
ok=True
ims=[]
for n,s in [("logo-d2",(64,80)),("logo-d2-mini",(32,40)),("logo-d2-horizontal",(96,24))]:
    im=Image.open(D+n+".png").convert("RGBA"); ims.append(im)
    if im.size!=s: print("tam",n,im.size); ok=False
    cols=set(); 
    for p in im.getdata():
        if p[3] not in(0,255): print("alfa",n,p); ok=False
        if p[3]==255:
            cols.add(p[:3])
    bad=cols-pal
    if bad: print("paleta",n,bad); ok=False
    print(n,im.size,len(cols),"colores")
    out=Image.new("RGBA",(im.width*6,im.height*6))
    out.paste(im.resize((im.width*6,im.height*6),Image.NEAREST))
    bg=Image.new("RGBA",out.size,(38,43,68,255)); bg.alpha_composite(out)
    bg.save("assets-src/previews/"+n+"-x6.png")
# 2 vs 1: el digito azul tiene fila superior con curva (no es una barra vertical) -> contar azules por fila en el circulo
for n,im in zip(["big","mini","horiz"],ims):
    blue=[(x,y) for y in range(im.height) for x in range(im.width) if im.getpixel((x,y))[:3]==(0x12,0x4e,0x89)]
    ys=sorted(set(y for _,y in blue)); 
    wid=[len([1 for x,y in blue if y==yy]) for yy in ys]
    print(n,"azul filas",wid)
print("TODO OK" if ok else "FALLOS")
