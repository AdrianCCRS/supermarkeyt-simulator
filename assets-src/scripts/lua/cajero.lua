local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local o=L.new(32,32)
local K="181425"
local SPANS={[3]={11,20},[4]={9,22},[5]={8,23},[6]={8,23},[7]={8,23},[8]={8,23},[9]={8,23},[10]={8,23},[11]={8,23},[12]={8,23},[13]={8,23},[14]={8,23},[15]={8,23},[16]={9,22},[17]={11,20}}
-- torso, piernas
local lg={K=K,a="63c74d",b="3e8948",c="265c42",k="e8b796",j="c28569",p="5a6988",q="3a4466",f="ffffff",g="8b9bb4",w="ffffff",x="c0cbdc"}
local function r(x,y,s) o:rows(x,y,{s},lg) end
r(8,18,"KaaaaabbbbbbbcKK")
for y=19,25 do r(9,y,"K"..(y==19 and "aaaabbbbbbcc" or "aaabbbbbbbcc").."K") end
r(9,26,"Kcccccccccccc")
r(9,26,"KcccccccccccK")
-- insignia
o:rect(11,21,3,2,"ffffff"); o:rect(11,22,3,1,"c0cbdc")
-- piernas
for y=27,28 do r(10,y,"KppppKKqqqqK") end
r(9,29,"KfffffKKfffffffK"); r(9,30,"KgggggKKgggggggK"); r(9,31,"KKKKKKKKKKKKKKKK")
-- brazo con las dos manos sobre el mostrador (hacia la derecha)
local arm={
 {20,"......KKKK"},
 {21,"......KkjK"},
 {22,"KKKKKKKkjK"},
 {23,"KaabbbKKKK"},
 {24,"KbbcccKkjK"},
 {25,"KKKKKKKkjK"},
 {26,"......KKKK"}}
for _,t in ipairs(arm) do r(22,t[1],t[2]) end
r(22,19,"KKKKKK")
-- cabeza
for y=3,17 do
  local a,b=SPANS[y][1],SPANS[y][2]
  for x=a,b do
    local edge=(x==a or x==b or y==3 or y==17)
    local c
    if edge then c=K elseif x>=21 or y>=16 then c="c28569" else c="e8b796" end
    o:px(x,y,c)
  end
end
-- pelo de atras
o:rect(9,9,3,6,"733e39"); o:rect(9,15,2,1,"733e39"); o:rect(9,9,1,6,"3e2731")
-- oreja
o:rect(12,12,2,2,"c28569"); o:px(12,12,"b86f50")
-- gorra
local cap={
 {2,"...KKKKKKKKKK"},
 {3,".KaaaabbbbbbccK"},
 {4,"KaaaaabbbbbbbbcK"},
 {5,"KaaaabbbbbbbbccK"},
 {6,"KaabbbbbbbbbbbcK"},
 {7,"KbbbbbbbbbbbbbcK"},
 {8,"KccccccccccccccK"}}
for _,t in ipairs(cap) do o:rows(8,t[1],{t[2]},lg) end
-- visera hacia la derecha
o:rect(22,7,7,1,K)
o:rect(22,8,1,1,K); o:rect(23,8,5,1,"3e8948"); o:rect(28,8,1,1,K)
o:rect(23,8,2,1,"63c74d")
o:rect(22,9,7,1,K)
-- cara (mirando a la derecha)
for _,x in ipairs{14,19} do
  o:px(x,11,"ffffff"); o:px(x+1,11,K); o:px(x,12,K); o:px(x+1,12,K); o:px(x,13,K); o:px(x+1,13,K)
end
o:px(16,14,"f6757a"); o:px(17,14,"f6757a")
o:px(18,15,K); o:px(19,16,K); o:px(20,16,K); o:px(21,15,K)
o:px(23,12,"e8b796"); o:px(24,12,"e8b796"); o:px(24,13,"e8b796"); o:px(25,12,K); o:px(25,13,K); o:px(24,14,K); o:px(23,13,"c28569")
o:save(L.ROOT.."public/assets/img/characters/cajero.png")
print("ok")
