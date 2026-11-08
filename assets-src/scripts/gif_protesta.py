from PIL import Image
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'
im=Image.open(R+'public/assets/img/characters/clientes-protesta.png').convert('RGBA')
for n in range(4):
    fr=[]
    for c in range(6):
        f=im.crop((32*c,38*n,32*c+32,38*n+38))
        bg=Image.new('RGBA',f.size,(120,160,120,255)); bg.alpha_composite(f)
        fr.append(bg.resize((192,228),0).convert('RGB').convert('P',palette=Image.ADAPTIVE))
    fr[0].save(R+f"assets-src/previews/cliente-{n+1}-protesta-x6.gif",save_all=True,append_images=fr[1:],duration=120,loop=0)
