local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local K="181425"

-- cabeza: spans por fila (x0,x1)
local SPANS={[3]={11,20},[4]={9,22},[5]={8,23},[6]={8,23},[7]={8,23},[8]={8,23},[9]={8,23},[10]={8,23},[11]={8,23},[12]={8,23},[13]={8,23},[14]={8,23},[15]={8,23},[16]={9,22},[17]={11,20}}
local function head(o,ox,sk)
  for y=3,17 do
    local a,b=SPANS[y][1],SPANS[y][2]
    for x=a,b do
      local edge=(x==a or x==b or y==3 or y==17)
      local c
      if edge then c=K
      elseif x>=21 or y>=16 then c=sk.shade
      else c=sk.base end
      o:px(ox+x,y,c)
    end
  end
end

-- cuerpo generico
local function body(o,ox,c)
  local lg={K=K,a=c.s1,b=c.s2,c=c.s3,k=c.sk.base,j=c.sk.shade,p=c.p1,q=c.p2,f=c.f1,g=c.f2}
  local function r(x,y,s) o:rows(ox+x,y,{s},lg) end
  r(6,18,"..KaaaabbbbbbbbccK..")
  local torso="aaabbbbbbbcc"
  for y=19,23 do r(6,y,"KabK"..torso.."KbcK") end
  for y=24,25 do r(6,y,"KkjK"..torso.."KkjK") end
  r(6,26,"KKKK"..("cccccccccccc").."KKKK")
  for y=27,28 do r(10,y,"KppppKKqqqqK") end
  for y=29,29 do r(9,y,"KfffffKKfffffK") end
  r(9,30,"KgggggKKgggggK")
  r(9,31,"KKKKKKKKKKKKKK")
end

local function face(o,ox,e,fx)
  local W,Q="ffffff",K
  local function p(x,y,c) o:px(ox+x,y,c) end
  local function eye(x,kind)
    if kind=="n" then p(x,11,W) p(x+1,11,K) p(x,12,K) p(x+1,12,K) p(x,13,K) p(x+1,13,K)
    elseif kind=="w" then p(x,10,K) p(x+1,10,K) p(x,11,W) p(x+1,11,K) p(x,12,W) p(x+1,12,K)
    elseif kind=="a" then p(x,12,K) p(x+1,12,K) p(x,13,K) p(x+1,13,K) end
  end
  if e==1 then
    eye(11,"n") eye(19,"n")
    p(14,15,K) p(17,15,K) p(15,16,K) p(16,16,K)
  elseif e==2 then
    eye(11,"w") eye(19,"w")
    p(14,15,K) p(16,15,K) p(15,16,K) p(17,16,K)
    -- gota de sudor a la izquierda de la cabeza
    p(5,5,"2ce8f5"); p(4,6,"0099db") p(5,6,"2ce8f5") p(6,6,"0099db"); p(4,7,"0099db") p(5,7,"ffffff") p(6,7,"0099db"); p(5,8,"0099db")
  elseif e==3 then
    eye(11,"a") eye(19,"a")
    p(10,10,K) p(11,10,K) p(12,11,K) p(13,11,K) p(21,10,K) p(20,10,K) p(19,11,K) p(18,11,K)
    p(15,15,K) p(16,15,K) p(14,16,K) p(17,16,K)
    for _,x in ipairs{9,10,11,20,21,22} do p(x,14,"e43b44") p(x,15,"e43b44") end
    p(9,14,fx.cheekSkin or "e43b44")
  else
    p(10,13,K) p(11,12,K) p(12,12,K) p(13,13,K)
    p(18,13,K) p(19,12,K) p(20,12,K) p(21,13,K)
    p(13,15,K) p(18,15,K) p(14,16,K) p(15,16,K) p(16,16,K) p(17,16,K)
    p(10,14,"f6757a") p(11,14,"f6757a") p(20,14,"f6757a") p(21,14,"f6757a")
  end
end

local function build(cfg)
  local o=L.new(128,32)
  for e=1,4 do
    local ox=(e-1)*32
    body(o,ox,cfg)
    if cfg.torso then o:rows(ox+10,18,cfg.torso,cfg.torsoLg) end
    if cfg.torsoY then for _,t in ipairs(cfg.torsoY) do o:rows(ox+t[1],t[2],t[3],t[4]) end end
    head(o,ox,cfg.sk)
    if cfg.skin then cfg.skin(o,ox) end
    if cfg.hair then o:rows(ox+cfg.hx,cfg.hy,cfg.hair,cfg.hg) end
    if cfg.pre then cfg.pre(o,ox,e) end
    face(o,ox,e,cfg)
    if cfg.post then cfg.post(o,ox,e) end
  end
  return o
end

-- ============ cliente 1: mujer joven castaña, coleta, camiseta amarilla
local skA={base="e8b796",shade="c28569",hi="ead4aa"}
local c1={sk=skA,s1="fee761",s2="feae34",s3="f77622",p1="124e89",p2="3a4466",f1="b86f50",f2="733e39",
 hx=8,hy=2,hg={K=K,h="b86f50",H="733e39",D="3e2731"},
 hair={
 "..KKKKKKKKKKKK..",
 ".KhhhhHHHHHHDDK.",
 "KhhhhhHHHHHHHDDK",
 "KhhhHHHHHHHHHHDK",
 "KHHHHHHHHHHHHHDK",
 "KHHHHH....HHHHDK",
 "KHHH........HHDK",
 "KH............DK",
 "KH............DK",
 "KH............DK",
 "KH............DK",
 "KH............DK",
 "KH............DK",
 "KH............DK",
 },
 post=function(o,ox,e)
   o:rows(ox+24,5,{".KK.","KhHK","KRRK","KHHK","KHDK","KHDK",".KDK","..KK"},{K=K,h="b86f50",H="733e39",D="3e2731",R="e43b44"})
 end}
-- ============ cliente 2: señor mayor
local skB={base="e8b796",shade="c28569",hi="ead4aa"}
local c2={sk=skB,s1="ffffff",s2="ead4aa",s3="c0cbdc",p1="5a6988",p2="3a4466",f1="3a4466",f2="262b44",
 hx=8,hy=7,hg={K=K,g="c0cbdc",G="8b9bb4"},
 hair={"KG............GK","KG............GK","KG............GK","KG............GK","KG............GK"},
 skin=function(o,ox) for _,p in ipairs{{11,5},{12,5},{13,5},{14,5},{11,6},{12,6},{13,6},{10,7}} do o:px(ox+p[1],p[2],"ead4aa") end
   for _,p in ipairs{{11,4},{12,4},{13,4}} do o:px(ox+p[1],p[2],"ead4aa") end end,
 torso={"AAmwwwwwwmdd","AAmmwwwwmmdd","AAmmmwwmmmdd","AAmmmwwommdd","AAmmmwwmmmdd","AAmmmwwommdd","AAmmmmmmmmdd","AAmmmmmmmmdd","dddddddddddd"},
 torsoLg={A="b86f50",m="733e39",d="3e2731",w="ead4aa",o="feae34"},
 pre=function(o,ox,e)
   -- gafas
   local fr="5a6988"
   for _,x0 in ipairs{10,18} do
     o:rect(ox+x0,10,4,5,fr); o:rect(ox+x0+1,11,2,3,"ead4aa")
   end
   o:rect(ox+14,11,4,1,fr)
 end,
 post=function(o,ox,e)
   -- cejas pobladas + bigote gris
   if e~=3 then o:rect(ox+10,9,4,1,"c0cbdc"); o:rect(ox+18,9,4,1,"c0cbdc") else o:rect(ox+10,9,1,1,"c0cbdc") end
   o:rows(ox+11,14,{"cccccccccc","8888888888"},{c="c0cbdc",["8"]="8b9bb4"})
   o:rect(ox+13,14,6,1,"c0cbdc")
 end}
-- el bigote tapa la boca: la boca se pinta bajo el bigote en y=16
-- ============ cliente 3: adolescente, sudadera azul
local skC={base="e8b796",shade="c28569",hi="ead4aa"}
local c3={sk=skC,s1="0099db",s2="124e89",s3="193c3e",p1="5a6988",p2="3a4466",f1="ffffff",f2="8b9bb4",
 hx=8,hy=0,hg={K=K,h="5a6988",H="262b44"},
 hair={
 "....K....K...K..",
 "...KHK..KHK.KHK.",
 "..KhhHHHHHHHHHK.",
 ".KhhHHHHHHHHHHK.",
 "KhhHHHHHHHHHHHHK",
 "KhHHHHHHHHHHHHHK",
 "KHHHHHHHHHHHHHHK",
 "KHHHHHHHHHHHHHHK",
 "KHHHH.HHH.HHHHHK",
 "KHH..........HHK",
 "KH............HK"},
 torso={"aaaaaaaaaaaa","aabbwbbwbbaa","aabbwbbwbbaa","aabbwbbwbbaa","bbbbbbbbbbbb","bbccccccccbb","bbcbbbbbbcbb","bbcbbbbbbcbb","cccccccccccc"},
 torsoLg={a="0099db",b="124e89",c="193c3e",w="ffffff"}}
-- ============ cliente 4: mujer adulta, pelo rizado oscuro, blusa verde, pendientes
local skD={base="c28569",shade="b86f50",hi="e8b796"}
local c4={sk=skD,s1="63c74d",s2="3e8948",s3="265c42",p1="3e2731",p2="262b44",f1="b86f50",f2="733e39",
 torso={"aaaakkkkbbcc","aaaabkkbbbcc","aaabbbbbbbcc","aabbbbbbbbcc","aabbbwbbbbcc","aabbbbbbbbcc","aabbbwbbbbcc","aabbbbbbbbcc","cccccccccccc"},
 torsoLg={a="63c74d",b="3e8948",c="265c42",k="c28569",w="ffffff"},
 pre=function(o,ox,e)
   -- pelo rizado: bloque amplio
   local sp={[1]={10,21},[2]={8,23},[3]={7,24},[4]={6,25},[5]={6,25},[6]={6,25},[7]={6,25},[8]={6,25},[9]={6,9},[10]={6,8},[11]={7,8},[12]={7,8}}
   local sp2={[9]={22,25},[10]={23,25},[11]={23,24},[12]={23,24}}
   local function put(y,a,b)
     for x=a,b do
       local edge=(x==a or x==b or y==1 or (sp[y-1]==nil))
       if y>=9 then edge=(x==a or x==b or y==12) end
       local c
       if edge then c=K else c=((x+y*2)%5==0) and "733e39" or (((x+y)%4==1) and "262b44" or "3e2731") end
       o:px(ox+x,y,c)
     end
   end
   for y=1,8 do put(y,sp[y][1],sp[y][2]) end
   for y=9,12 do put(y,sp[y][1],sp[y][2]); put(y,sp2[y][1],sp2[y][2]) end
   -- ondulaciones del borde (rizos)
   for _,x in ipairs{9,13,17,21} do o:px(ox+x,1,""); end
   for _,x in ipairs{7,11,15,19,23} do o:px(ox+x,2,K) end
   -- flequillo rizado sobre la frente
   for x=9,22 do o:px(ox+x,9,(x%2==0) and "3e2731" or K) end
   for x=10,21 do o:px(ox+x,9,(x%3==0) and "733e39" or "3e2731") end
   o:px(ox+9,9,K) o:px(ox+22,9,K)
 end,
 post=function(o,ox,e)
   o:rect(ox+7,14,1,2,"feae34"); o:rect(ox+24,14,1,2,"feae34"); o:px(ox+7,16,"e8b796"); o:px(ox+24,16,"e8b796")
 end}
local out={c1,c2,c3,c4}
for i,c in ipairs(out) do
  local o=build(c)
  o:save(L.ROOT.."public/assets/img/characters/cliente-"..i..".png")
end
print("ok")
