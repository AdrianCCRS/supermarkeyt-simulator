local R="/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/"
local I=R.."public/assets/img/"
local function pal(spr)
  local P={"be4a2f","d77643","ead4aa","e4a672","b86f50","733e39","3e2731","a22633","e43b44","f77622","feae34","fee761","63c74d","3e8948","265c42","193c3e","124e89","0099db","2ce8f5","ffffff","c0cbdc","8b9bb4","5a6988","3a4466","262b44","181425","ff0044","68386c","b55088","f6757a","e8b796","c28569"}
  local p=spr.palettes[1]; p:resize(#P)
  for i,h in ipairs(P) do p:setColor(i-1,Color(tonumber(h:sub(1,2),16),tonumber(h:sub(3,4),16),tonumber(h:sub(5,6),16))) end
end
local function layer(spr,name,img,x,y)
  local l=spr:newLayer(); l.name=name
  spr:newCel(l,1,img,Point(x,y))
end
-- tienda.aseprite
local spr=Sprite(288,270,ColorMode.RGB); pal(spr)
spr.layers[1].name="suelo"
local su=Image{fromFile=I.."tienda/suelo.png"}
local fl=Image(160,270,ColorMode.RGB)
for y=0,269,16 do for x=0,159,16 do fl:drawImage(su,Point(x,y)) end end
spr:newCel(spr.layers[1],1,fl,Point(0,0))
local list={
 {"pared","tienda/pared-estanterias.png",0,0},
 {"cestas","tienda/cestas.png",60,140},
 {"planta","tienda/planta.png",86,160},
 {"expositor","tienda/expositor.png",56,72},
 {"mostrador","tienda/mostrador.png",104,56},
 {"cartel-caja","tienda/cartel-caja.png",108,40},
 {"cajero","characters/cajero.png",56,220},
 {"cliente-1","characters/cliente-1.png",160,0},
 {"cliente-2","characters/cliente-2.png",160,32},
 {"cliente-3","characters/cliente-3.png",160,64},
 {"cliente-4","characters/cliente-4.png",160,96},
}
for _,t in ipairs(list) do layer(spr,t[1],Image{fromFile=I..t[2]},t[3],t[4]) end
spr:saveAs(R.."assets-src/tienda.aseprite"); spr:close()
-- iconos-faltantes.aseprite
local names={"lac-002","car-001","car-002","car-003","des-001","des-002","des-003","beb-001","lim-001","lim-002","hig-001"}
local s2=Sprite(16*#names,16,ColorMode.RGB); pal(s2)
s2.layers[1].name=names[1]
s2:newCel(s2.layers[1],1,Image{fromFile=I.."icons/"..names[1]..".png"},Point(0,0))
for i=2,#names do layer(s2,names[i],Image{fromFile=I.."icons/"..names[i]..".png"},(i-1)*16,0) end
s2:saveAs(R.."assets-src/iconos-faltantes.aseprite"); s2:close()
print("ok")
