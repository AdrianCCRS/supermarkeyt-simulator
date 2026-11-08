-- Animaciones de clientes y cajero (Aseprite Lua). Parte de los frames 1 existentes.
local ROOT="/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/"
local CH=ROOT.."public/assets/img/characters/"
local pc=app.pixelColor
local function C(h) return pc.rgba(tonumber(h:sub(1,2),16),tonumber(h:sub(3,4),16),tonumber(h:sub(5,6),16),255) end
local K=C("181425")
local function new(w,h) return Image(w or 32,h or 38) end
local function get(im,x,y) if x<0 or y<0 or x>=im.width or y>=im.height then return 0 end return im:getPixel(x,y) end
local function put(im,x,y,p) if x>=0 and y>=0 and x<im.width and y<im.height then im:drawPixel(x,y,p) end end
local function opaque(p) return pc.rgbaA(p)>0 end
local function rnd(v) return math.floor(v+0.5) end
local function blit(dst,src,dx,dy,x0,y0,x1,y1)
  for y=y0,y1 do for x=x0,x1 do local p=get(src,x,y); if opaque(p) then put(dst,x+dx,y+dy,p) end end end
end
local function blitrow(dst,src,sr,dr,x0,x1) for x=x0,x1 do local p=get(src,x,sr); if opaque(p) then put(dst,x,dr,p) end end end
local function fillrect(im,x0,y0,x1,y1,c) for y=y0,y1 do for x=x0,x1 do put(im,x,y,c) end end end
local function ascii(im,x,y,rows,leg)
  for j,r in ipairs(rows) do for i=1,#r do local ch=r:sub(i,i); if ch~="." then put(im,x+i-1,y+j-1,leg[ch]) end end end
end
local function outline(im,o)
  o=o or {}
  local add={}
  for y=0,im.height-1 do for x=0,im.width-1 do
    if not opaque(get(im,x,y)) then
      local hit=false
      if o.top~=false and opaque(get(im,x,y+1)) then hit=true end
      if o.bottom~=false and opaque(get(im,x,y-1)) then hit=true end
      if o.side~=false and (opaque(get(im,x-1,y)) or opaque(get(im,x+1,y))) then hit=true end
      if hit then add[#add+1]={x,y} end
    end
  end end
  for _,p in ipairs(add) do put(im,p[1],p[2],K) end
end
local function savePNG(img,path)
  local s=Sprite(img.width,img.height); s.cels[1].image:drawImage(img,Point(0,0)); s:saveAs(path); s:close()
end
local function copyimg(src) local d=new(src.width,src.height); d:drawImage(src,Point(0,0)); return d end

-- ====================== clientes
local function sheetFrame(sheet,i) local f=new(); blit(f,sheet,-32*i,0,32*i,0,32*i+31,37); return f end

local function legs(im,F,xa,xb,lift,b)
  local np=3-b-lift
  local y=31+b
  for i=0,np-1 do blitrow(im,F,31+math.min(i,2),y+i,xa,xb) end
  y=y+np
  for r=0,3 do blitrow(im,F,34+r,y+r,xa,xb) end
end
local function arm(im,F,xa,xb,d,b)
  local rows={20}
  if d>=0 then for i=0,d do rows[#rows+1]=21 end end
  for r=22,30 do rows[#rows+1]=r end
  for i,r in ipairs(rows) do blitrow(im,F,r,20+b+i-1,xa,xb) end
end
local function front(im,F,o)
  local b=o.b or 0
  legs(im,F,9,15,o.lL or 0,b); legs(im,F,16,22,o.lR or 0,b)
  blit(im,F,0,b,8,19,23,19); blit(im,F,0,b,9,20,22,30)
  if not o.noL then arm(im,F,0,8,o.dL or 0,b) end
  if not o.noR then arm(im,F,23,31,o.dR or 0,b) end
  blit(im,F,0,b,0,0,31,18)
  return im
end
local BAGL={K=K,d=C("733e39"),e=C("e4a672"),b=C("b86f50")}
local function bag(im,x,y)
  ascii(im,x,y,{
   "..dddddd..",
   "..d....d..",
   "KKKKKKKKKK",
   "KddddddddK",
   "KeeeeeebbK",
   "KeeeeeebbK",
   "KeeeeeebbK",
   "KeeeeeebbK",
   "KeeeeeebbK",
   "KeeeeeebbK",
   "KbbbbbbbbK",
   "KKKKKKKKKK"},BAGL)
end
-- secuencias de caminar (frente)
local LR={0,1,2,1,0,0}; local LL={0,0,0,0,1,2}; local BOB={0,0,-1,0,0,-1}

-- ====== perfiles
local PAL={
 {name="cliente-1",skin={"e8b796","c28569"},hair={"b86f50","733e39","3e2731"},torso={"fee761","feae34","f77622"}},
 {name="cliente-2",skin={"e8b796","c28569"},hair={"ead4aa","8b9bb4","c0cbdc"},torso={"b86f50","733e39","3e2731"}},
 {name="cliente-3",skin={"e8b796","c28569"},hair={"5a6988","262b44","262b44"},torso={"0099db","124e89","193c3e"}},
 {name="cliente-4",skin={"c28569","b86f50"},hair={"733e39","3e2731","262b44"},torso={"63c74d","3e8948","265c42"}},
}
local function headP(n,c)
  local im=new()
  local s1,s2=C(c.skin[1]),C(c.skin[2])
  local h1,h2,h3=C(c.hair[1]),C(c.hair[2]),C(c.hair[3])
  fillrect(im,11,3,22,16,s1)
  fillrect(im,22,8,22,15,s2); fillrect(im,12,16,22,16,s2)
  fillrect(im,23,12,23,13,s1)
  if n==1 then
    fillrect(im,11,3,22,7,h2); fillrect(im,11,3,14,4,h1); fillrect(im,21,3,22,7,h3)
    fillrect(im,11,8,19,8,h2); fillrect(im,11,9,18,9,h2); fillrect(im,11,10,15,14,h2)
    fillrect(im,15,8,15,14,h3); fillrect(im,11,10,11,13,h1)
    -- coleta atras
    ascii(im,5,5,{"..hhh.","..hhhh","hhhhRh","hhhhRh","hhhh.","..hh."},{h=h2,R=C("e43b44")})
    put(im,7,6,h1); put(im,8,6,h1)
  elseif n==2 then
    fillrect(im,11,3,15,4,C("ead4aa"))
    fillrect(im,11,8,13,13,h2); fillrect(im,11,8,11,13,h3)
    fillrect(im,19,10,22,13,C("c0cbdc")); fillrect(im,20,11,21,12,C("5a6988"))
    fillrect(im,17,10,18,10,C("c0cbdc"))
    fillrect(im,19,14,22,14,C("c0cbdc")); fillrect(im,19,15,22,16,C("8b9bb4"))
  elseif n==3 then
    fillrect(im,11,3,22,8,h2); fillrect(im,11,3,13,4,h1)
    fillrect(im,11,9,19,9,h2); fillrect(im,11,10,15,13,h2); fillrect(im,15,9,15,13,C("262b44"))
    for _,x in ipairs{13,17,21} do fillrect(im,x,1,x,2,h2) end
  else
    local spans={[2]={11,21},[3]={9,23},[4]={8,24},[5]={7,24},[6]={7,24},[7]={7,24},[8]={7,24},[9]={7,22},[10]={7,15},[11]={7,15},[12]={8,14},[13]={9,14}}
    for y,sp in pairs(spans) do for x=sp[1],sp[2] do
      local c1=h2
      if (x+y)%3==0 then c1=h1 elseif (x*2+y)%5==0 then c1=h3 end
      put(im,x,y,c1)
    end end
  end
  fillrect(im,16,10,17,12,s2)
  if n==4 then fillrect(im,16,13,16,14,C("feae34")) end
  outline(im)
  fillrect(im,12,18,20,18,K)
  -- cara
  put(im,21,11,K); put(im,21,12,K)
  if n~=2 then put(im,20,11,C("ffffff")); put(im,21,15,K) else put(im,20,11,C("ffffff")) end
  return im
end

local function torsoP(n,c)
  local im=new()
  local t1,t2,t3=C(c.torso[1]),C(c.torso[2]),C(c.torso[3])
  fillrect(im,11,19,21,30,t2); fillrect(im,11,19,12,29,t1); fillrect(im,20,19,21,29,t3); fillrect(im,11,30,21,30,t3)
  if n==2 then
    fillrect(im,19,19,21,24,C("ead4aa")); put(im,20,25,C("feae34")); put(im,20,28,C("feae34"))
  elseif n==3 then
    fillrect(im,11,19,16,24,t1); fillrect(im,17,19,21,24,t2)
    for y=20,24 do put(im,14,y,C("ffffff")); put(im,16,y,C("ffffff")) end
    fillrect(im,11,25,21,29,t2); fillrect(im,11,25,21,25,t3)
  elseif n==4 then
    for _,y in ipairs{24,25,27,28} do put(im,20,y,C("ffffff")) end
  end
  outline(im,{bottom=false})
  return im
end

local function armP(S,dx,far,anchor)
  local im=new()
  for y=19,29 do
    local x=anchor+rnd(dx*(y-19)/10)
    local a,b2
    if y<=26 then a,b2=S.sA,S.sB else a,b2=S.hA,S.hB end
    if far then a,b2=(y<=26) and S.sB or S.hB, (y<=26) and S.sB or S.hB end
    put(im,x,y,a); put(im,x+1,y,b2); put(im,x+2,y,b2)
  end
  outline(im,{top=false})
  return im
end

local function legP(S,dx,lift,b,near)
  local im=new(); local np=3-b-lift; local y0=31+b; local total=np+3
  local pcol=near and S.pN or S.pF
  local r=0
  for i=0,np-1 do local s=rnd(dx*(r+0.5)/total); fillrect(im,13+s,y0+i,17+s,y0+i,pcol); r=r+1 end
  for j=0,2 do
    local s=rnd(dx*(r+0.5)/total); r=r+1
    local col=(j<2) and S.shT or S.shS
    fillrect(im,13+s,y0+np+j,19+s,y0+np+j,col)
  end
  outline(im,{top=false})
  return im
end

local function profile(n,S,i)
  local Adx={3,1,-1,-3,-1,1}; local Al={0,0,0,0,2,1}
  local ai=i+1; local bi=(i+3)%6+1
  local b=BOB[ai]
  local im=new()
  blit(im,armP(S,rnd(Adx[ai]*5/3),true,16),0,b,0,0,31,37)
  blit(im,legP(S,Adx[bi],Al[bi],b,false),0,0,0,0,31,37)
  blit(im,legP(S,Adx[ai],Al[ai],b,true),0,0,0,0,31,37)
  blit(im,S.torso,0,b,0,0,31,37)
  blit(im,armP(S,-Adx[ai],false,14),0,b,0,0,31,37)
  blit(im,S.head,0,b,0,0,31,37)
  return im
end

-- ====== brazos de la fila 4
local BILL={K=K,e=C("ead4aa"),g=C("63c74d")}
local BILLR={"KKKKKKKK","KgeeeegK","KgeeeegK","KKKKKKKK"}
local function arm4(im,leg,frame)
  local L=leg
  if frame==2 or frame==5 then
    local rows={"stK.....","stK.....","KstK....",".KstK...","..KhgK..","..KhgK..","..KKKK.."}
    if frame==5 then rows[5]="..KhhgK."; rows[6]="..KhhgK."; rows[7]="..KKKKK." end
    ascii(im,23,20,rows,L)
  elseif frame==3 then
    ascii(im,23,20,{"KKKKKKK","ssshhhK","tttgggK","KKKKKKK"},L)
    ascii(im,24,17,BILLR,BILL)
    put(im,27,20,L.h); put(im,28,20,L.h)
  elseif frame==4 then
    ascii(im,23,19,{"...KKKKK.","KKKhhhhK.","ssshhhgK.","tttggggK.","KKKKKKKK."},L)
    ascii(im,24,26,BILLR,BILL)
  elseif frame==6 then
    ascii(im,23,20,{"stK","stK","stK","stK","hgK","hgK","KKK"},L)
  end
end

-- ====== construir los clientes
local sheets={}
local ANIM={}
for n=1,4 do
  local sheet=Image{fromFile=CH.."cliente-"..n..".png"}
  local F=sheetFrame(sheet,0)
  local p=function(x,y) return get(F,x,y) end
  local S={sA=p(23,22),sB=p(24,22),hA=p(23,28),hB=p(24,28),pN=p(12,32),pF=p(18,32),shT=p(11,35),shS=p(11,36)}
  S.torso=torsoP(n,PAL[n]); S.head=headP(n,PAL[n])
  local L={K=K,s=S.sA,t=S.sB,h=S.hA,g=S.hB}
  local out=new(192,152)
  for i=0,5 do
    -- fila 1
    local f=new(); front(f,F,{b=BOB[i+1],lL=LL[i+1],lR=LR[i+1],dL=(LR[i+1]-((LL[i+1]>0) and 1 or 0)),dR=(LL[i+1]-((LR[i+1]>0) and 1 or 0))})
    out:drawImage(f,Point(i*32,0));
    -- fila 2
    local g=profile(n,S,i)
    out:drawImage(g,Point(i*32,38));
  end
  -- fila 3 (bolsa)
  local r3={}
  for i=0,5 do
    local f=new()
    local dL=(i>=1 and i<=3) and -1 or 0
    bag(f,0,26+dL)
    front(f,F,{b=BOB[i+1],lL=LL[i+1],lR=LR[i+1],dL=dL,dR=(LL[i+1]-((LR[i+1]>0) and 1 or 0))})
    out:drawImage(f,Point(i*32,76))
  end
  -- fila 4
  for i=0,5 do
    local f=new()
    if i==0 then front(f,F,{})
    elseif i<=3 then front(f,F,{noR=true}); arm4(f,L,i+1)
    elseif i==4 then front(f,F,{noR=true}); arm4(f,L,5)
    else
      front(f,F,{noR=true}); bag(f,20,24); arm4(f,L,6)
    end
    out:drawImage(f,Point(i*32,114))
  end
  savePNG(out,CH.."cliente-"..n.."-anim.png")
  ANIM[n]=out
end

-- ====== cajero
do
  local Cz=Image{fromFile=CH.."cajero-izq.png"}
  local out=new(128,38)
  local f1=copyimg(Cz)
  local f2=new(); blit(f2,Cz,0,1,0,0,31,23); blit(f2,Cz,0,0,0,25,31,37)
  local sk1,sk2=C("e8b796"),C("c28569")
  -- mano abierta
  local f3=copyimg(Cz)
  for y=22,30 do for x=0,3 do f3:drawPixel(x,y,0) end end
  ascii(f3,0,24,{".KK.","KddK","KddK","KdhK","KdhK","KhhK","KKKK"},{K=K,d=sk1,h=sk2})
  -- mano cerrada con billetes
  local f4=copyimg(Cz)
  ascii(f4,0,22,BILLR,BILL)
  out:drawImage(f1,Point(0,0)); out:drawImage(f2,Point(32,0)); out:drawImage(f3,Point(64,0)); out:drawImage(f4,Point(96,0))
  savePNG(out,CH.."cajero-anim.png")
  ANIM[5]=out
end

-- ====== fuente .aseprite
do
  local spr=Sprite(32,38)
  app.transaction(function()
    spr.layers[1].name="cliente-1"
    for i=2,5 do local l=spr:newLayer(); l.name=(i<5) and ("cliente-"..i) or "cajero" end
    for f=2,24 do spr:newFrame(spr.frames[#spr.frames]) end
  end)
  -- limpiar celdas copiadas
  for _,cel in ipairs(spr.cels) do spr:deleteCel(cel) end
  local names={"caminar_frente","caminar_derecha","caminar_frente_bolsa","dar_dinero_y_coger_bolsa"}
  for li=1,5 do
    local layer=spr.layers[li]
    local sheet=ANIM[li]
    if li<5 then
      local k=0
      for row=0,3 do for col=0,5 do
        k=k+1
        local im=new(); im:drawImage(sheet,Point(-col*32,-row*38))
        spr:newCel(layer,k,im,Point(0,0))
      end end
    else
      for col=0,3 do local im=new(); im:drawImage(sheet,Point(-col*32,0)); spr:newCel(layer,col+1,im,Point(0,0)) end
    end
  end
  for r=0,3 do local t=spr:newTag(r*6+1,r*6+6); t.name=names[r+1] end
  local t=spr:newTag(1,4); t.name="cajero_anim"
  for _,fr in ipairs(spr.frames) do fr.duration=0.1 end
  spr:saveAs(ROOT.."assets-src/animaciones-personajes.aseprite")
end
print("ok")
