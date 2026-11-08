local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local K="181425"
local OUT=L.ROOT.."public/assets/img/tienda/"
local function fix(rows,w) for i,r in ipairs(rows) do if #r~=w then print("BAD ROW",i,#r,w,r); rows[i]=(#r<w) and (r..string.rep(".",w-#r)) or r:sub(1,w) end end return rows end

-- ================= MOSTRADOR-CAJA 64x214
do
local o=L.new(64,214)
-- madera (x0..21)
o:rect(0,0,22,214,K)
o:rect(1,1,20,212,"e4a672")
o:rect(1,1,20,2,"ead4aa"); o:rect(1,1,1,212,"ead4aa")      -- luz arriba-izquierda
o:rect(19,3,2,210,"b86f50"); o:rect(1,211,20,2,"b86f50")  -- sombra derecha/abajo
for _,v in ipairs{{3,36,6},{11,62,7},{3,94,7},{9,136,8},{3,172,9},{7,184,8},{4,198,7},{11,26,5},{12,100,6}} do o:rect(v[1],v[2],v[3],1,"b86f50") end
o:px(0,0,"");o:px(1,0,"");o:px(0,1,"")
-- rieles (acero 2 px)
o:rect(22,0,1,214,"c0cbdc"); o:rect(23,0,1,214,"8b9bb4")
o:rect(22,0,2,1,K)
for y=12,213,24 do if y<186 then o:px(22,y,"ffffff"); o:px(23,y,"5a6988") end end
o:rect(56,0,1,214,"c0cbdc"); o:rect(57,0,1,214,"8b9bb4")
o:rect(56,0,2,1,K)
for y=12,185,24 do o:px(56,y,"ffffff"); o:px(57,y,"5a6988") end
-- lateral derecho
local lg={K=K,s="c0cbdc",m="8b9bb4",n="5a6988",g="3a4466",w="ffffff"}
local P={}
for y=0,213 do P[y]="KsmmnK" end
P[0]="KKKKK."
y=1
while y<172 do
  local r=(y-1)%33
  if r==0 then P[y]="KnnnnK" elseif r==1 then P[y]="KggggK"
  elseif r==3 or r==28 then P[y]="KwmmnK" elseif r==4 or r==29 then P[y]="KnmmnK" end
  y=y+1
end
P[172]="KnnnnK"; P[173]="KggggK"; P[174]="KsssnK"; P[175]="KmmmnK"; P[176]="KnnnnK"; P[177]="KggggK"
P[186]="KwmmnK"; P[187]="KnmmnK"; P[210]="KwmmnK"; P[211]="KnmmnK"; P[213]="KKKKK."
for y=0,213 do o:rows(58,y,{P[y]},lg) end
o:px(63,0,"");o:px(63,1,"");o:px(62,0,"")
-- bordes de arriba redondeados: cierra la esquina
o:px(62,1,K)
-- hueco del escaner
o:rect(24,186,32,28,"262b44")
-- ---- objetos sobre el mostrador (lado del cajero)
local function put(x,y,rows,leg,w) fix(rows,w); o:rows(x,y,rows,leg) end
local base={K=K,W="ffffff",w="c0cbdc",v="8b9bb4",n="262b44",u="5a6988"}
local function mix(t) local r={} for k,v in pairs(base) do r[k]=v end for k,v in pairs(t) do r[k]=v end return r end
-- telefono 16x12
put(3,16,{
".KKKKKKKKKKKKKK.",
"KwwwwwwwwwwwwvvK",
"KwKKKKKKKKKKKKvK",
".KKwwwwwwwwwwKK.",
".KwwwwwwwwwwwvK.",
".KwnwnwnwwwwwvK.",
".KwwwwwwwwwwwvK.",
".KwnwnwnwwwwwvK.",
".KwwwwwwwwwwwvK.",
".KwnwnwnwwwwwvK.",
".KvvvvvvvvvvvvK.",
"..KKKKKKKKKKKK.."},mix{},16)
-- datafono 12x10
put(5,46,{
".KKKKKKKKKK.",
"KwwwwwwwwwvK",
"KwKKKKKKKKvK",
"KwKhhhhhhKvK",
"KwKggggggKvK",
"KwKKKKKKKKvK",
"KwnwnwnwnwvK",
"KwwwwwwwwwvK",
"KvvvvvvvvvvK",
".KKKKKKKKKK."},mix{h="63c74d",g="3e8948"},12)
-- portabolsas 14x16
put(4,70,{
"..KKKKKKKKKK..",
".KwwwwwwwwwwK.",
".KKvKKKKKKvKK.",
".KWWWWWWWWWWK.",
".KWWKKWWKKWWK.",
".KWWWWWWWWWwK.",
".KWWWWWWWWwwK.",
".KWWWwwWWWwwK.",
".KWWWWwWWWwvK.",
".KWWWWwWWwwvK.",
".KWWWWWWWwwvK.",
".KWWWWWWwwvvK.",
".KWWWWwwwwvvK.",
".KwwwwwwwvvvK.",
"..KKKKKKKKKK..",
".............."},mix{},14)
-- cajon con frutas 20x14
local cr={
"..KKKK..KKKK..KKKK..",
".KpprrKKllyoKKpprrK.",
".KprraKKlyyoKKprraK.",
".KrraaKKyyooKKrraaK.",
"KKKKKKKKKKKKKKKKKKKK",
"KhhhhhhhhhhhhhhhhhhK",
"KbbbbbbbbbbbbbbbbbdK",
"KccccccccccccccccccK",
"KbbbbbbbbbbbbbbbbbdK",
"KbbbbbbbbbbbbbbbbbdK",
"KccccccccccccccccccK",
"KbbbbbbbbbbbbbbbbbdK",
"KddddddddddddddddddK",
"KKKKKKKKKKKKKKKKKKKK"}
put(1,108,cr,mix{h="ead4aa",b="e4a672",d="b86f50",c="733e39",p="f6757a",r="e43b44",a="a22633",l="fee761",y="feae34",o="f77622"},20)
-- libreta con lapiz 10x8
put(7,146,{
"KuKuKuKKfK",
"KWWWWwKKwK",
"KWvvvwKKyK",
"KWWWWwKKyK",
"KWvvvwKKyK",
"KWWWWwKKeK",
"KwwwwwKKKK",
"KKKKKKK..."},mix{f="f6757a",y="feae34",e="e8b796"},10)
o:save(OUT.."mostrador-caja.png")
end
print("ok mostrador")
