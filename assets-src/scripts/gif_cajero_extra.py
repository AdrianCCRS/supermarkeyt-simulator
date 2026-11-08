# GIFs de revision x6 de cada animacion de cajero-extra.png -> assets-src/previews/
import json
from PIL import Image
R='/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/'
im=Image.open(R+'public/assets/img/characters/cajero-extra.png').convert('RGBA')
for e in json.load(open(R+'public/assets/img/characters/cajero-extra-layout.json')):
    fr=[]
    for c in range(e['frames']):
        f=im.crop((32*c,38*e['fila'],32*c+32,38*e['fila']+38))
        bg=Image.new('RGBA',f.size,(120,160,120,255)); bg.alpha_composite(f)
        fr.append(bg.resize((192,228),0).convert('RGB').convert('P',palette=Image.ADAPTIVE))
    dur=170 if e['nombre']!='reposo' else 300
    fr[0].save(R+f"assets-src/previews/cajero-extra-{e['nombre']}-x6.gif",save_all=True,append_images=fr[1:],duration=dur,loop=0)
