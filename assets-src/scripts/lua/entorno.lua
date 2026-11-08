local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local OUT=L.ROOT.."public/assets/img/entorno/"
local K="181425"
local pieces={}
local function pat(o,x,y,rows,leg) o:rows(x,y,rows,leg) end
local function keep(name,o) o:save(OUT..name..".png"); table.insert(pieces,{name,o}) end

-- ===== toldo (tile horizontal): periodo 16, rayas de 8, feston inferior
local PROF={4,5,6,6,6,6,5,4}
local function toldo(o,x0,y0,w,c1,c2,sideOutline)
  -- c = {main,shade,dark} ; c1 rayas A, c2 rayas B
  for i=0,w-1 do
    local s=math.floor(i/8)%2
    local c=(s==0) and c1 or c2
    local lx=i%8
    local h=PROF[lx+1]
    for j=0,13+h do
      local col
      if j==0 then col=K
      elseif j==1 then col=c[4]
      elseif j<=9 then col=c[1]
      elseif j<=11 then col=c[2]
      else col=c[3] end
      if j==13+h then col=K end
      if j>13 and j<13+h then col=(j>=13+h-1) and c[3] or c[2] end
      o:px(x0+i,y0+j,col)
    end
  end
  if sideOutline then
    for j=0,19 do
      -- columna lateral: solo hasta donde llega el arco
      if j<=13+PROF[1] then o:px(x0,y0+j,K) end
      if j<=13+PROF[8] then o:px(x0+w-1,y0+j,K) end
    end
  end
end
local RED={ "e43b44","a22633","a22633","f6757a"}
local WHT={ "ffffff","c0cbdc","8b9bb4","ffffff"}
local t=L.new(32,20); toldo(t,0,0,32,RED,WHT,false); keep("toldo",t)

-- ===== ladrillo 16x16
local b=L.new(16,16)
local tones={{"e4a672","d77643","b86f50"},{"d77643","b86f50","733e39"}}
for y=0,15 do
  local course=math.floor(y/4); local ry=y%4
  for x=0,15 do
    local off=(course%2==0) and 0 or 4
    local bx=(x+off)%8
    local bi=(math.floor((x+off)/8)+course)%2+1
    local c
    if ry==0 or bx==0 then c="ead4aa" else
      local tn=tones[bi]
      if ry==1 then c=(bi==1) and tn[1] or "e4a672" elseif ry==2 then c=tn[2] else c=tn[3] end
    end
    b:px(x,y,c)
  end
end
keep("ladrillo",b)

-- ===== acera 32x16
local a=L.new(32,16)
for y=0,15 do for x=0,31 do
  local c
  if y<=3 then c=(y==0) and "ffffff" or "c0cbdc"; if x%16==0 then c="5a6988" end
  elseif y==4 then c="5a6988"
  elseif y<=8 then c=(y==5) and "ffffff" or "c0cbdc"; if (x+8)%16==0 then c="5a6988" end
  elseif y==9 then c="5a6988"
  elseif y==10 then c="ffffff"
  elseif y<=12 then c="c0cbdc"
  elseif y==13 then c="8b9bb4"
  elseif y==14 then c="5a6988"
  else c=K end
  a:px(x,y,c)
end end
keep("acera",a)

-- ===== nubes
local function cloud(o,circles,base,x0,x1)
  local f={}
  for y=0,o.h-1 do f[y]={} end
  for _,c in ipairs(circles) do
    for y=0,o.h-1 do for x=x0,x1 do
      local dx,dy=x-c[1],y-c[2]
      if dx*dx+dy*dy<=c[3]*c[3]+c[3]*0.6 and y<=base then f[y][x]=true end
    end end
  end
  local function F(x,y) return f[y] and f[y][x] end
  for y=0,o.h-1 do for x=x0,x1 do
    if F(x,y) then
      local c="ffffff"
      if not F(x,y+1) then c="8b9bb4" elseif not F(x,y+2) then c="c0cbdc" elseif not F(x+1,y+1) and not F(x+1,y) then c="c0cbdc" end
      o:px(x,y,c)
    elseif F(x+1,y) or F(x-1,y) or F(x,y+1) or F(x,y-1) then o:px(x,y,K) end
  end end
end
local n=L.new(48,24)
cloud(n,{{8,16,4},{14,11,6},{22,15,5},{18,16,5}},19,0,29)
cloud(n,{{35,19,3},{40,16,4},{44,19,3}},21,29,47)
keep("cielo-nube",n)
local ns=L.new(24,12)
cloud(ns,{{6,8,3},{11,5,4},{17,7,3},{12,8,3}},9,0,23)
keep("nube-pequena",ns)

-- ===== cartel 192x40
local c=L.new(192,40)
for y=8,39 do for x=0,191 do
  local col
  if x>=8 and x<=183 and y>=12 and y<=35 then col="e4a672"
  else
    local din=math.min(x,191-x,y-8,39-y) -- distancia al borde
    if din==0 then col=K
    elseif x>=7 and x<=184 and y>=11 and y<=36 then col="733e39"
    elseif (y==9 and x>=1 and x<=190) or (x==1 and y>=9 and y<=38) then col="e4a672"
    elseif (y==38) or (x==190) then col="733e39"
    else col="b86f50" end
  end
  c:px(x,y,col)
end end
for _,p in ipairs({{3,10},{186,10},{3,35},{186,35}}) do c:rect(p[1],p[2],2,2,"c0cbdc") c:px(p[1]+1,p[2]+1,"8b9bb4") end
for _,cx in ipairs({22,168}) do
  for y=0,7 do
    local m=y%4
    if m==0 then c:px(cx+1,y,K) elseif m==1 then c:px(cx,y,K) c:px(cx+1,y,"c0cbdc") c:px(cx+2,y,K)
    elseif m==2 then c:px(cx,y,K) c:px(cx+2,y,K) else c:px(cx,y,K) c:px(cx+1,y,"8b9bb4") c:px(cx+2,y,K) end
  end
end
keep("cartel",c)

-- ===== suelo
local s=L.new(16,16)
for y=0,15 do for x=0,15 do
  local A=((math.floor(x/8)+math.floor(y/8))%2==0)
  local ry=y%8
  local col
  if A then col=(ry==7) and "e4a672" or ((ry==0) and "ffffff" or "ead4aa")
  else col=(ry==7) and "d77643" or ((ry==0) and "ead4aa" or "e4a672") end
  s:px(x,y,col)
end end
keep("mini-suelo",s)

-- ===== fachadas
local function ball(o,x,y,m,h,sd)
  pat(o,x,y,{".KKKK.","KhhmmK","KhmmmK","KmmmsK","KmmssK",".KKKK."},{K=K,h=h,m=m,s=sd})
end
local function ballStem(o,x,y,m,h,sd) ball(o,x,y,m,h,sd) o:px(x+3,y-1,"3e8948") o:px(x+2,y-1,"63c74d") end
local function loaf(o,x,y)
  pat(o,x,y,{".KKKKKK.","KhhmmmmK","KhmKmKsK","KmmmmmsK","KmmssssK",".KKKKKK."},{K=K,h="feae34",m="e4a672",s="d77643"})
  o:px(x+3,y+2,"d77643") o:px(x+5,y+2,"d77643")
end
local function bag(o,x,y) -- baguette vertical 4x14
  for j=0,13 do
    local e=(j==0 or j==13)
    if e then o:px(x+1,y+j,K) o:px(x+2,y+j,K)
    else o:px(x,y+j,K) o:px(x+3,y+j,K) o:px(x+1,y+j,"feae34") o:px(x+2,y+j,(j%4==2) and "d77643" or "e4a672") end
  end
end
local function croi(o,x,y)
  pat(o,x,y,{"..KKKK..",".KhhmmK.","KhmKmKmK","KmK.KKsK",".K..KK.K"},{K=K,h="feae34",m="e4a672",s="d77643"})
end
local function banana(o,x,y)
  pat(o,x,y,{"KK......","KfKKK...",".KffKK..","..KfffKK","...KKKfK",".....KKK"},{K=K,f="fee761"})
  o:px(x+3,y+1,"feae34") o:px(x+2,y+2,"feae34")
end
local function melon(o,x,y)
  pat(o,x,y,{"..KKKKKK..",".KhhmmmmK.","KhmdmmdmmK","KmmdmmdmsK","KmmdmmdssK",".KmdmmdsK.","..KKKKKK.."},{K=K,h="63c74d",m="3e8948",d="265c42",s="265c42"})
end
local function cone(o,x,y,sc,sh,ss)
  ball(o,x,y,sc,sh,ss)
  pat(o,x,y+6,{"KcdcsK",".KdcK.","..KK.."},{K=K,c="e4a672",d="d77643",s="b86f50"})
end
local function tub(o,x,y,m,h,sd) -- cubeta 10x6 con bola encima
  pat(o,x,y,{".KKKKKKKK.","KhhmmmmmmK","KmmmmmmmsK","KKKKKKKKKK"},{K=K,h=h,m=m,s=sd})
end

local function crate(o,x,w)
  o:rect(x,108,w,12,K)
  o:rect(x+1,109,w-2,10,"d77643")
  o:rect(x+1,109,w-2,1,"e4a672")
  o:rect(x+1,113,w-2,1,"b86f50")
  o:rect(x+1,118,w-2,1,"b86f50")
  o:rect(x+1,109,1,9,"e4a672")
  o:rect(x+w-2,110,1,9,"b86f50")
end

local function facade(name,cfg)
  local o=L.new(112,128)
  local T=cfg.trim
  -- pared
  for y=6,119 do for x=0,111 do
    local col=cfg.wall[1]
    if x==1 and y>6 then col=cfg.wall[4] end
    if y>=112 then col=cfg.wall[2] end
    if x==0 or x==111 then col=K end
    o:px(x,y,col)
  end end
  -- pilares laterales
  for y=6,119 do
    for x=2,5 do o:px(x,y,(x==2) and cfg.wall[4] or cfg.wall[1]) end
    for x=106,109 do o:px(x,y,(x==109) and cfg.wall[2] or cfg.wall[1]) end
    o:px(6,y,cfg.wall[2]) 
  end
  -- cornisa
  for x=0,111 do o:px(x,0,K) o:px(x,1,T[1]) o:px(x,2,T[1]) o:px(x,3,T[2]) o:px(x,4,T[2]) o:px(x,5,T[3]) end
  for y=0,5 do o:px(0,y,K) o:px(111,y,K) end
  for x=0,111 do o:px(x,6,K) end
  -- friso lisa x8..103 y9..20
  o:frame(7,8,98,14,K)
  o:rect(8,9,96,12,cfg.friso)
  o:rect(7,22,98,1,cfg.wall[2])
  -- sombra bajo toldo
  o:rect(2,44,108,2,cfg.wall[2])
  -- toldo
  toldo(o,4,24,104,cfg.aw1,cfg.aw2,true)
  -- cartel colgante lisa x80..97 y51..56
  o:px(80,44,K) o:px(97,44,K) o:px(80,45,"8b9bb4") o:px(97,45,"8b9bb4") o:px(80,46,K) o:px(97,46,K) o:px(80,47,K) o:px(97,47,K)
  o:rect(78,48,22,11,K)
  o:rect(79,49,20,9,"b86f50")
  o:rect(79,49,20,1,"e4a672")
  o:rect(80,51,18,6,"ead4aa")
  o:rect(79,57,20,1,"733e39")
  -- escaparate x8..65 y50..97
  o:rect(8,50,58,48,K)
  o:rect(9,51,56,46,"b86f50"); o:rect(9,51,56,1,"e4a672"); o:rect(9,51,1,46,"e4a672"); o:rect(64,52,1,45,"733e39"); o:rect(10,96,55,1,"733e39")
  o:rect(10,52,54,43,K)
  o:rect(11,53,52,41,cfg.back)
  cfg.window(o)
  -- reflejos
  for i=0,5 do o:px(13+i,60-i,"ffffff") o:px(14+i,60-i,"ffffff") end
  for i=0,3 do o:px(21+i,60-i,"ffffff") end
  for i=0,5 do o:px(45+i,66-i,"ffffff") end
  -- puerta x76..101 y60..119
  o:rect(76,60,26,60,K)
  o:rect(77,61,24,58,"b86f50"); o:rect(77,61,1,58,"e4a672"); o:rect(100,62,1,57,"733e39"); o:rect(77,61,24,1,"e4a672")
  o:rect(80,64,18,21,K); o:rect(81,65,16,19,"0099db"); o:rect(81,65,16,1,"2ce8f5")
  for i=0,7 do o:px(83+i,76-i,"2ce8f5") o:px(84+i,76-i,"2ce8f5") end
  o:rect(80,85,18,1,"733e39")
  o:rect(80,90,18,25,"d77643"); o:frame(80,90,18,25,"733e39"); o:rect(81,91,16,1,"e4a672"); o:rect(81,91,1,23,"e4a672")
  o:rect(92,100,3,3,"fee761"); o:px(94,102,"feae34")
  -- escalon
  o:rect(74,119,30,1,K)
  -- zocalo
  for y=120,127 do for x=0,111 do
    local col="8b9bb4"; if y==120 then col="c0cbdc" end; if y>=125 then col="5a6988" end
    if y==127 or x==0 or x==111 then col=K end
    o:px(x,y,col)
  end end
  -- mostrador / cajones exteriores x4..70
  cfg.goods(o)
  keep(name,o)
end

-- porticos de frutas / panes
local function shelfBalls(o,y,cols)
  o:rect(11,y,52,2,"733e39"); o:rect(11,y,52,1,"b86f50")
  for i,cc in ipairs(cols) do ball(o,12+(i-1)*8,y-6,cc[1],cc[2],cc[3]) end
end
local RM={"e43b44","f6757a","a22633"}; local YM={"fee761","ffffff","feae34"}; local GM={"63c74d","a3e68a","3e8948"}
GM[2]="fee761"; local OM={"f77622","feae34","be4a2f"}
facade("fachada-fruteria",{
  trim={"ffffff","c0cbdc","8b9bb4"}, wall={"ead4aa","e4a672","b86f50","ffffff"}, friso="3e8948",
  aw1={"3e8948","265c42","265c42","63c74d"}, aw2=WHT, back="fee761",
  window=function(o)
    shelfBalls(o,72,{RM,OM,GM,YM,RM,OM})
    shelfBalls(o,90,{GM,YM,OM,RM,GM,YM})
  end,
  goods=function(o)
    crate(o,4,22); crate(o,26,22); crate(o,48,22)
    local function row(x,list,y) for i,cc in ipairs(list) do ball(o,x+(i-1)*6,y,cc[1],cc[2],cc[3]) end end
    row(6,{RM,RM,RM},98); row(9,{RM,RM},98)
    row(6,{RM,RM,RM},102)
    ballStem(o,9,97,RM[1],RM[2],RM[3])
    row(28,{OM,OM,OM},98); row(31,{YM,YM},98); row(28,{YM,OM,YM},102)
    row(50,{GM,GM,GM},98); row(53,{GM,GM},98); banana(o,50,101); banana(o,56,99); row(60,{GM},102)
    melon(o,71,111) -- sandia junto a la puerta
  end})
local BM={"e4a672","feae34","d77643"}
facade("fachada-panaderia",{
  trim={"ead4aa","e4a672","d77643"}, wall={"e8b796","c28569","733e39","ead4aa"}, friso="733e39",
  aw1={"f77622","be4a2f","be4a2f","feae34"}, aw2={"ead4aa","e4a672","c28569","ffffff"}, back="fee761",
  window=function(o)
    shelfBalls(o,72,{}); shelfBalls(o,90,{})
    for i=0,5 do loaf(o,12+i*8,66) end
    for i=0,2 do croi(o,14+i*14,85) end
    for i=0,5 do loaf(o,12+i*8,84) end
  end,
  goods=function(o)
    crate(o,4,22); crate(o,26,22); crate(o,48,22)
    for i=0,3 do bag(o,7+i*4,94) end; 
    loaf(o,7,101) loaf(o,15,101)
    for i=0,2 do loaf(o,29+i*6,99) end; loaf(o,29,103) loaf(o,37,103)
    croi(o,51,103) croi(o,59,103) croi(o,55,98) croi(o,31,97)
    bag(o,70,100)
  end})
local PK={"f6757a","ffffff","b55088"}; local BL={"0099db","2ce8f5","124e89"}; local MI={"2ce8f5","ffffff","0099db"}; local CH={"b86f50","e4a672","733e39"}
facade("fachada-esquina",{
  trim={"ffffff","c0cbdc","8b9bb4"}, wall={"2ce8f5","0099db","124e89","ffffff"}, friso="b55088",
  aw1={"f6757a","b55088","b55088","ffffff"}, aw2=WHT, back="ffffff",
  window=function(o)
    shelfBalls(o,72,{}); shelfBalls(o,90,{})
    for i=0,5 do local cc={PK,BL,CH,YM,MI,PK}; cone(o,12+i*8,60,cc[i+1][1],cc[i+1][2],cc[i+1][3]) end
    for i=0,5 do local cc={YM,PK,MI,CH,PK,BL}; cone(o,12+i*8,78,cc[i+1][1],cc[i+1][2],cc[i+1][3]) end
  end,
  goods=function(o)
    crate(o,4,22); crate(o,26,22); crate(o,48,22)
    local cc={PK,BL,YM,CH,MI,PK}
    for i=0,2 do cone(o,7+i*7,97,cc[i+1][1],cc[i+1][2],cc[i+1][3]) end
    for i=0,2 do cone(o,29+i*7,97,cc[i+4][1],cc[i+4][2],cc[i+4][3]) end
    ball(o,51,100,PK[1],PK[2],PK[3]); ball(o,58,100,BL[1],BL[2],BL[3]); ball(o,65,100,YM[1],YM[2],YM[3])
    ball(o,54,95,MI[1],MI[2],MI[3]); ball(o,61,95,PK[1],PK[2],PK[3])
    ball(o,51,104,YM[1],YM[2],YM[3]); ball(o,58,104,PK[1],PK[2],PK[3])
  end})

-- ===== fuente .aseprite: una capa por pieza
local W,H=512,300
local spr=Sprite(W,H,ColorMode.RGB)
local pal=spr.palettes[1]; pal:resize(#L.PAL); for i,h in ipairs(L.PAL) do local c=L.col(h); pal:setColor(i-1,Color(app.pixelColor.rgbaR(c),app.pixelColor.rgbaG(c),app.pixelColor.rgbaB(c))) end
local x,y,rowh=0,0,0
for i,p in ipairs(pieces) do
  local o=p[2]
  if x+o.w>W then x=0; y=y+rowh+4; rowh=0 end
  local layer=(i==1) and spr.layers[1] or spr:newLayer()
  layer.name=p[1]
  spr:newCel(layer,1,o.img,Point(x,y))
  x=x+o.w+4; if o.h>rowh then rowh=o.h end
end
spr:saveAs(L.ROOT.."assets-src/entorno.aseprite")
spr:close()
