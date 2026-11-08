local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local o=L.new(56,214)
local lg={K="181425",a="e4a672",b="b86f50",t="733e39",s="c0cbdc",m="8b9bb4",n="5a6988",g="3a4466",w="ffffff"}
local lgR={K="181425",a="b86f50",b="e4a672",t="733e39",s="5a6988",m="8b9bb4",n="c0cbdc",g="3a4466",w="ffffff"}
-- filas del panel izquierdo (12 px)
local P={}
for y=0,213 do P[y]="KabtsmmmmmnK" end
P[0]="..KKKKKKKKKK"; P[1]=".KsssssssssK"; P[2]="KsssssssssmK"
-- paneles de 33 filas con ranura y remaches
local y=3
while y<172 do
  local r=(y-3)%33
  if r==0 then P[y]="KbbtnnnnnnnK" elseif r==1 then P[y]="KtttgggggggK"
  elseif r==3 or r==28 then P[y]="KabtswmmmwnK" elseif r==4 or r==29 then P[y]="KabtsnmmmnnK" end
  y=y+1
end
-- collar de union con el escaner
P[172]="KbbtnnnnnnnK"; P[173]="KtttgggggggK"
P[174]="KssssssssssK"; P[175]="KmmmmmmmmmnK"; P[176]="KnnnnnnnnnnK"
P[177]="KtttgggggggK"
P[186]="KabtswmmmwnK"; P[187]="KabtsnmmmnnK"
P[210]="KabtswmmmwnK"; P[211]="KabtsnmmmnnK"
P[213]=".KKKKKKKKKKK"
for y=0,213 do
  o:rows(0,y,{P[y]},lg)
  o:rows(44,y,{P[y]:reverse()},lgR)
end
-- hueco del escaner (color de la banda)
o:rect(12,186,32,28,"262b44")
o:save(L.ROOT.."public/assets/img/tienda/mostrador.png")
print("ok")
