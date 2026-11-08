-- HUD de la jornada: barra, botones, lampara, iconos, panel de cierre. Genera public/assets/img/hud/* y assets-src/hud.aseprite
local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local OUT=L.ROOT.."public/assets/img/hud/"
local K="181425"

-- ============ BARRA 480x24
local B=L.new(480,24)
B:rect(0,0,480,24,"3a4466")
B:rect(0,0,480,1,K) B:rect(0,23,480,1,K) B:rect(0,0,1,24,K) B:rect(479,0,1,24,K)
B:rect(1,1,478,1,"5a6988")            -- bisel superior
B:rect(1,22,478,1,"733e39")           -- labio de madera inferior
-- tapas de madera laterales
B:rect(1,1,1,22,"d77643") B:rect(2,1,1,22,"b86f50") B:rect(3,1,1,22,"733e39")
B:rect(477,1,1,22,"b86f50") B:rect(478,1,1,22,"733e39")
B:rect(1,22,3,1,"733e39") B:rect(477,22,2,1,"733e39")
-- hendidura con doble bisel alrededor de [x,y,w,h]
local function slot(x,y,w,h,fill)
  B:rect(x-2,y-2,w+4,1,"262b44") B:rect(x-2,y-2,1,h+4,"262b44")           -- sombra sup/izq (anillo 2)
  B:rect(x-2,y+h+1,w+4,1,"5a6988") B:rect(x+w+1,y-2,1,h+4,"5a6988")      -- luz inf/der
  B:frame(x-1,y-1,w+2,h+2,K)
  B:rect(x,y,w,h,fill)
end
local slots={{18,4,84,16},{108,4,60,16},{174,4,60,16},{240,4,60,16},{306,4,90,16}}
for _,s in ipairs(slots) do slot(s[1],s[2],s[3],s[4],"193c3e") end
-- zona de boton: rebajada suave
B:frame(407,3,70,18,K)
B:rect(408,3,68,1,K) B:rect(407,3,1,18,K)
B:rect(408,20,68,1,"5a6988") B:rect(476,4,1,17,"5a6988")
B:rect(408,4,68,16,"262b44")
B:rect(407,20,1,1,K)
-- hueco de lampara 8x8 en (6,8)
B:rect(4,6,12,1,"262b44") B:rect(4,6,1,12,"262b44")
B:rect(4,17,12,1,"5a6988") B:rect(15,6,1,12,"5a6988")
B:frame(5,7,10,10,K)
B:rect(6,8,8,8,"262b44")
B:save(OUT.."hud-barra.png")

-- ============ BOTON 68x16 x6
local function boton(pal,state)
  local im=L.new(68,16)
  im:rect(1,0,66,16,K) im:rect(0,1,68,14,K)         -- silueta con esquinas cortadas
  local hi,base,sh=pal[1],pal[2],pal[3]
  im:rect(1,1,66,14,base)
  if state=="pressed" then
    im:rect(1,1,66,2,sh) im:rect(1,1,2,14,sh)
  else
    im:rect(1,1,66,1,hi) im:rect(1,1,1,14,hi)
    im:rect(1,14,66,1,sh) im:rect(66,1,1,14,sh)
  end
  -- esquinas interiores suaves
  im:px(1,1,state=="pressed" and sh or hi)
  return im
end
local G={"63c74d","3e8948","265c42"}
local R={"f6757a","e43b44","a22633"}
local D={"5a6988","3a4466","262b44"}
local W=L.new(408,16)
local seq={{G,"normal"},{G,"pressed"},{D,"normal"},{R,"normal"},{R,"pressed"},{D,"normal"}}
for i,s in ipairs(seq) do
  local f=boton(s[1],s[2])
  for y=0,15 do for x=0,67 do local p=f.img:getPixel(x,y)
    if app.pixelColor.rgbaA(p)>0 then W.img:putPixel((i-1)*68+x,y,p) end end end
end
-- desactivado: sin relieve hundido, igual al normal gris (frame 3 y 6 ya son iguales)
W:save(OUT.."hud-boton.png")

-- ============ LAMPARA 8x8 x3
local lamp={"..KKKK..",".KhhbbK.","KhhbbbbK","KhbbbbsK","KbbbbbsK","KbbbbssK",".KssssK.","..KKKK.."}
local LA=L.new(24,8)
local cols={{h="f6757a",b="e43b44",s="a22633"},{h="63c74d",b="3e8948",s="265c42"},{h="fee761",b="feae34",s="f77622"}}
for i,c in ipairs(cols) do LA:rows((i-1)*8,0,lamp,{K=K,h=c.h,b=c.b,s=c.s}) end
LA:save(OUT.."hud-lampara.png")

-- ============ ICONOS 10x10 x4
local IC=L.new(40,10)
IC:rows(0,0,{"..KKKKKK..",".KhhhhhhK.","KhhhhhhhhK","KhhhhKhhwK","KhhhhKhhwK","KhhhhKKKwK","KhhhhhhhwK","KhhhhhhwsK",".KwwwwwsK.","..KKKKKK.."},{K=K,h="ffffff",w="c0cbdc",s="8b9bb4"})
-- el reloj: cara c0cbdc con luz blanca; ajustamos a 3 tonos reales
IC:rect(0,0,10,10,nil)
IC:rows(0,0,{"..KKKKKK..",".KhhhhwwK.","KhhhhwwwwK","KhhhKKwwsK","KhhhKwwwsK","KhhhKKKwsK","KhwwwwwwsK","KwwwwwwssK",".KsssssssK","..KKKKKK.."},{K=K,h="ffffff",w="c0cbdc",s="8b9bb4"})
IC:rows(10,0,{"...KKKK...","..KrrrrK..","..KeeeeK..","..KeeesK..","...KKKK...","..KKbbKK..",".KbbbbbbK.","KbbbbbbbsK","KbbbbbbssK","KKKKKKKKKK"},{K=K,r="733e39",e="e4a672",s="c28569",b="0099db"})
IC:rows(20,0,{"....KK....","...KhhK...","...KhbK...","KKKKhbbKKK",".KhhbbbbsK","..KhbbbsK.","..KbbbbsK.",".KbbbKbbsK",".KbbK..KsK",".KKK....KK"},{K=K,h="fee761",b="feae34",s="f77622"})
IC:rows(30,0,{"..KKKKKK..",".KhhhhhbK.","KhhbbbbbsK","KhbbddbbsK","KhbbddbbsK","KhbbddbbsK","KbbbddbbsK","KbbbbbbssK",".KssssssK.","..KKKKKK.."},{K=K,h="fee761",b="feae34",s="f77622",d="f77622"})
IC:save(OUT.."hud-iconos.png")

-- ============ PANEL 224x168
local P=L.new(224,168)
local W_,H_=224,168
P:rect(0,0,W_,H_,"733e39")
-- marco de madera: anillos de 5 px
local function ring(i,tl,br,x0,y0,x1,y1) -- anillo i (0=borde) en rectangulo [x0..x1]
  local a,b,c,d=x0+i,y0+i,x1-i,y1-i
  P:rect(a,b,c-a+1,1,tl) P:rect(a,b,1,d-b+1,tl)
  P:rect(a,d,c-a+1,1,br) P:rect(c,b,1,d-b+1,br)
end
-- zona del marco global (0..223,0..167)
ring(0,K,K,0,0,223,167)
ring(1,"d77643","733e39",0,0,223,167)
ring(2,"b86f50","b86f50",0,0,223,167)
ring(3,"b86f50","b86f50",0,0,223,167)
ring(4,"733e39","d77643",0,0,223,167)
ring(5,K,K,0,0,223,167)
-- tablero interior
P:rect(6,6,212,156,"262b44")
-- banda de titulo y 6..16 (11 px) en 3a4466
P:rect(6,6,212,11,"3a4466")
P:rect(5,17,214,1,K)               -- linea inferior de la banda
-- divisor de madera y 18..20, linea y21
P:rect(1,18,222,1,"d77643") P:rect(1,19,222,1,"b86f50") P:rect(1,20,222,1,"733e39")
P:rect(0,18,1,3,K) P:rect(223,18,1,3,K)
P:rect(1,18,1,3,"d77643") P:rect(222,18,1,3,"733e39")
P:rect(5,21,214,1,K)
P:rect(6,22,212,140,"262b44")
-- la banda queda delimitada arriba por la linea y5 (anillo 5)
-- remaches en las esquinas
local function stud(x,y) P:px(x,y,"c0cbdc") P:px(x+1,y,"8b9bb4") P:px(x,y+1,"8b9bb4") P:px(x+1,y+1,"5a6988") end
stud(2,2) stud(220,2) stud(2,164) stud(220,164)
-- esquinas cortadas
for _,c in ipairs({{0,0},{223,0},{0,167},{223,167}}) do P:px(c[1],c[2],nil) end
P:save(OUT.."panel-cierre.png")

-- ============ FUENTE .aseprite (una capa por pieza)
local spr=Sprite(480,240,ColorMode.RGB)
local pal=spr.palettes[1]; pal:resize(#L.PAL)
for i,h in ipairs(L.PAL) do local c=L.col(h); pal:setColor(i-1,Color(app.pixelColor.rgbaR(c),app.pixelColor.rgbaG(c),app.pixelColor.rgbaB(c))) end
local function layer(name,im,x,y,first)
  local ly
  if first then ly=spr.layers[1] else ly=spr:newLayer() end
  ly.name=name
  spr:newCel(ly,1,im.img,Point(x,y))
end
layer("hud-barra",B,0,0,true)
layer("hud-boton",W,0,30)
layer("hud-lampara",LA,0,50)
layer("hud-iconos",IC,0,62)
layer("panel-cierre",P,0,72)
spr:saveAs(L.ROOT.."assets-src/hud.aseprite")
spr:close()
return "ok"
