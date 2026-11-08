-- Botones de pagina del libro PLU (6 frames 12x12) + placa de numero 30x12
local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local OUT=L.ROOT.."public/assets/img/caja/"
local K="181425"
-- estados: body, luz, sombra, flecha
local S={
  normal ={body="ead4aa",hi="ffffff",sh="e4a672",arrow="265c42"},
  hover  ={body="fee761",hi="ffffff",sh="feae34",arrow="a22633"},
  pressed={body="e4a672",hi="b86f50",sh=nil,   arrow="265c42"},
}
-- triangulo derecho en coords locales del boton de 11x11 (x=3..6, 7 filas)
local TRI={{3,2,8},{4,3,7},{5,4,6},{6,5,5}}
local function button(o,ox,oy,st,dir)
  local function p(x,y,c) o:px(ox+x,oy+y,c) end
  for y=0,10 do for x=0,10 do
    local corner=(x==0 or x==10) and (y==0 or y==10)
    if not corner then
      local c
      if x==0 or x==10 or y==0 or y==10 then c=K
      elseif st.sh and (y==9 or x==9) then c=st.sh
      elseif y==1 or x==1 then c=st.hi
      else c=st.body end
      p(x,y,c)
    end
  end end
  for _,t in ipairs(TRI) do
    for y=t[2],t[3] do
      local x=t[1]; if dir=="L" then x=10-x end
      p(x,y,st.arrow)
    end
  end
end
local names={{"izquierda","L","normal",0,0},{"izquierda-resaltada","L","hover",0,0},{"izquierda-pulsada","L","pressed",1,1},
             {"derecha","R","normal",0,0},{"derecha-resaltada","R","hover",0,0},{"derecha-pulsada","R","pressed",1,1}}
local sheet=L.new(72,12)
local spr=Sprite(12,12,ColorMode.RGB)
local pal=spr.palettes[1]; pal:resize(#L.PAL); for i,h in ipairs(L.PAL) do local c=L.col(h); pal:setColor(i-1,Color(app.pixelColor.rgbaR(c),app.pixelColor.rgbaG(c),app.pixelColor.rgbaB(c))) end
for i,n in ipairs(names) do
  local f=L.new(12,12)
  button(f,n[4],n[5],S[n[3]],n[2]); button(sheet,(i-1)*12+n[4],n[5],S[n[3]],n[2])
  if i>1 then spr:newFrame(i-1) end
  spr:newCel(spr.layers[1],i,f.img,Point(0,0))
  spr.frames[i].duration=0.1
end
spr.layers[1].name="flechas"
for i,n in ipairs(names) do local t=spr:newTag(i,i); t.name=n[1] end
spr:saveAs(L.ROOT.."assets-src/libro-flechas.aseprite"); spr:close()
sheet:save(OUT.."libro-flechas.png")
-- placa
local p=L.new(30,12)
for y=0,11 do for x=0,29 do
  local corner=(x==0 or x==29) and (y==0 or y==11)
  if not corner then
    local c
    if x==0 or x==29 or y==0 or y==11 then c=K
    elseif y==1 or x==1 then c="3e8948"
    elseif y==10 or x==28 then c="265c42"
    else c="193c3e" end
    p:px(x,y,c)
  end
end end
p:save(OUT.."libro-numero.png")
local s2=Sprite(30,12,ColorMode.RGB); s2.layers[1].name="placa"; s2:newCel(s2.layers[1],1,p.img,Point(0,0))
local pal2=s2.palettes[1]; pal2:resize(#L.PAL); for i,h in ipairs(L.PAL) do local c=L.col(h); pal2:setColor(i-1,Color(app.pixelColor.rgbaR(c),app.pixelColor.rgbaG(c),app.pixelColor.rgbaB(c))) end
s2:saveAs(L.ROOT.."assets-src/libro-numero.aseprite"); s2:close()
