local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local K="181425"
local OUT=L.ROOT.."public/assets/img/tienda/"
local function fix(rows,w) for i,r in ipairs(rows) do if #r~=w then print("BAD ROW",i,#r,w,r); rows[i]=(#r<w) and (r..string.rep(".",w-#r)) or r:sub(1,w) end end return rows end
local o=L.new(64,214)
local lg={K=K,s="c0cbdc",m="8b9bb4",n="5a6988",g="3a4466",w="ffffff"}
local PL,PR={},{}
for y=0,115 do PL[y]="Ks"..string.rep("m",14).."nKsm"; PR[y]="smKs"..string.rep("m",14).."nK" end
for y=6,115 do
  local r=y%24
  if r==0 or y==88 or y==114 then PL[y]="Kn"..string.rep("n",14).."nKsm"; PR[y]="smKn"..string.rep("n",14).."nK"
  elseif r==1 or y==89 or y==115 then PL[y]="Kg"..string.rep("g",14).."nKsm"; PR[y]="smKg"..string.rep("g",14).."nK" end
end
PL[0]=string.rep("K",20); PR[0]=string.rep("K",20)
for y=0,115 do o:rows(0,y,{PL[y]},lg); o:rows(44,y,{PR[y]},lg) end
for y=12,87,24 do for _,x in ipairs{4,13,48,57} do o:px(x,y,"ffffff"); o:px(x,y+1,"5a6988") end end
for _,p in ipairs{{0,0},{1,0},{2,0},{0,1},{1,1},{0,2},{63,0},{62,0},{61,0},{63,1},{62,1},{63,2}} do o:px(p[1],p[2],"") end
for _,p in ipairs{{2,1},{1,2},{61,1},{62,2}} do o:px(p[1],p[2],K) end
o:rect(20,88,24,28,"262b44")
-- mesa mostrador y116..213
o:rect(0,116,64,98,K)
o:rect(1,117,62,70,"e4a672")                       -- tablero
o:rect(1,117,62,2,"ead4aa"); o:rect(1,117,1,70,"ead4aa")
o:rect(62,119,1,68,"b86f50")
o:rect(1,187,62,1,"b86f50")
o:rect(1,188,62,1,"e4a672"); o:rect(1,189,62,4,"b86f50"); o:rect(1,193,62,1,"733e39")   -- canto frontal
o:rect(1,194,62,19,"b86f50")                        -- faldon
for _,x in ipairs{5,35} do
  o:rect(x,198,24,12,"733e39"); o:rect(x+1,199,22,10,"b86f50"); o:rect(x+1,199,22,1,"e4a672"); o:rect(x+1,199,1,10,"e4a672")
end
o:rect(1,211,62,2,"733e39")
for _,v in ipairs{{28,128,4},{5,158,0},{30,168,8},{3,184,10},{40,170,12},{22,182,9},{50,184,8},{28,120,5}} do if v[3]>0 then o:rect(v[1],v[2],v[3],1,"b86f50") end end
local function put(x,y,rows,leg,w) fix(rows,w); o:rows(x,y,rows,leg) end
local base={K=K,W="ffffff",w="c0cbdc",v="8b9bb4",n="262b44",u="5a6988"}
local function mix(t) local r={} for k,v in pairs(base) do r[k]=v end for k,v in pairs(t) do r[k]=v end return r end
-- telefono 16x12
put(6,172,{
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
put(46,174,{
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
-- portabolsas 12x16
put(6,148,{
"..KKKKKKKK..",
".KwwwwwwwwK.",
".KKvKKKKvKK.",
".KWWWWWWWWK.",
".KWKKWWKKWK.",
".KWWWWWWWwK.",
".KWWWWWWwwK.",
".KWWWwwWWwK.",
".KWWWWwWWwK.",
".KWWWWwWwwK.",
".KWWWWWWwwK.",
".KWWWWWwwvK.",
".KWWWwwwwvK.",
".KwwwwwwvvK.",
"..KKKKKKKK..",
"............"},mix{},12)
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
put(42,150,cr,mix{h="ead4aa",b="e4a672",d="b86f50",c="733e39",p="f6757a",r="e43b44",a="a22633",l="fee761",y="feae34",o="f77622"},20)
-- libreta con lapiz 10x8
put(30,176,{
"K3K3K3KKfK",
"KWWWWwKKwK",
"KWvvvwKKyK",
"KWWWWwKKyK",
"KWvvvwKKyK",
"KWWWWwKKeK",
"KwwwwwKKKK",
"KKKKKKK..."},mix{f="f6757a",y="feae34",e="e8b796",["3"]="3e2731",w="e8b796",v="c28569"},10)
o:save(OUT.."mostrador-caja.png")
print("ok mostrador")
