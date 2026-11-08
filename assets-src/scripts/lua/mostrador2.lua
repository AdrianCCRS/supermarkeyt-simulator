local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local K="181425"
local OUT=L.ROOT.."public/assets/img/tienda/"
local function fix(rows,w) for i,r in ipairs(rows) do if #r~=w then print("BAD ROW",i,#r,w,r); rows[i]=(#r<w) and (r..string.rep(".",w-#r)) or r:sub(1,w) end end return rows end
local o=L.new(64,214)
local lg={K=K,s="c0cbdc",m="8b9bb4",n="5a6988",g="3a4466",w="ffffff"}
-- ===== mitad de arriba (banda) y junta con el escaner: acero a ambos lados
local PL,PR={}, {}
for y=0,147 do PL[y]="KsmmmmmmmmmmmKsm"; PR[y]="smKsmmmmmmmmmmnK" end
PL[0]="KKKKKKKKKKKKKKKK"; PR[0]="KKKKKKKKKKKKKKKK"
for y=8,147 do
  local r=y%24
  if r==0 or y==120 or y==146 then PL[y]="KnnnnnnnnnnnKsm"..""; PR[y]="smKnnnnnnnnnnnK"
  elseif r==1 or y==121 or y==147 then PL[y]="KgggggggggggKsm"; PR[y]="smKgggggggggggK" end
end
for i,r in pairs(PL) do if #r==15 then PL[i]=r.."" end end
for y=0,147 do
  if #PL[y]==15 then PL[y]="K"..PL[y]:sub(2,12).."K"..PL[y]:sub(13) end
  if #PL[y]~=16 then PL[y]=PL[y]..string.rep("m",16-#PL[y]) end
  if #PR[y]~=16 then PR[y]=PR[y]..string.rep("m",16-#PR[y]) end
  o:rows(0,y,{PL[y]},lg); o:rows(48,y,{PR[y]},lg)
end
for y=12,147,24 do
  if y~=120 then o:px(4,y,"ffffff"); o:px(4,y+1,"5a6988"); o:px(11,y,"ffffff"); o:px(11,y+1,"5a6988")
  o:px(52,y,"ffffff"); o:px(52,y+1,"5a6988"); o:px(59,y,"ffffff"); o:px(59,y+1,"5a6988") end
end
o:px(0,0,""); o:px(1,0,""); o:px(0,1,""); o:px(63,0,""); o:px(62,0,""); o:px(63,1,"")
o:rect(16,120,32,28,"262b44")
-- ===== mesa de madera (toda la anchura) y148..213
o:rect(0,148,64,66,K)
o:rect(1,149,62,64,"e4a672")
o:rect(1,149,62,2,"ead4aa"); o:rect(1,149,1,60,"ead4aa")
o:rect(62,151,1,58,"b86f50")
o:rect(1,208,62,3,"b86f50"); o:rect(1,211,62,2,"733e39")
for _,v in ipairs{{5,170,9},{36,172,14},{20,197,10},{8,202,9},{44,194,14},{26,187,8},{48,203,8},{3,190,6}} do o:rect(v[1],v[2],v[3],1,"b86f50") end
local function put(x,y,rows,leg,w) fix(rows,w); o:rows(x,y,rows,leg) end
local base={K=K,W="ffffff",w="c0cbdc",v="8b9bb4",n="262b44",u="5a6988"}
local function mix(t) local r={} for k,v in pairs(base) do r[k]=v end for k,v in pairs(t) do r[k]=v end return r end
-- telefono 16x12
put(38,178,{
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
put(50,154,{
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
put(34,152,{
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
put(4,154,cr,mix{h="ead4aa",b="e4a672",d="b86f50",c="733e39",p="f6757a",r="e43b44",a="a22633",l="fee761",y="feae34",o="f77622"},20)
-- libreta con lapiz 10x8
put(8,180,{
"K3K3K3KKfK",
"KWWWWwKKwK",
"KWvvvwKKyK",
"KWWWWwKKyK",
"KWvvvwKKyK",
"KWWWWwKKeK",
"KwwwwwKKKK",
"KKKKKKK..."},mix{f="f6757a",y="feae34",e="e8b796",["3"]="3e2731",w="e8b796",v="c28569"},10)
o:save(OUT.."mostrador-caja.png")
print("ok")
