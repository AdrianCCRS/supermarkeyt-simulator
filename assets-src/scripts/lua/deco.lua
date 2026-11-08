local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local K="181425"
local OUT=L.ROOT.."public/assets/img/tienda/"
-- ===== cestas 28x20
do
  local o=L.new(28,20)
  local lg={K=K,h="f6757a",b="e43b44",d="a22633"}
  local basket={
   "KKKKKKKKKKKKKKKKKKKKKKKK",
   "KhhhhhhhhhhhhhhhhhhhhhhK",
   "KbbbbbbbbbbbbbbbbbbbbbbK",
   "KdddddddddddddddddddddK.",
   ".KbKbKbKbKbKbKbKbKbKbbK.",
   ".KhbbbbbbbbbbbbbbbbbbdK.",
   ".KbKbKbKbKbKbKbKbKbKddK.",
   "..KddddddddddddddddddK.."}
  -- normaliza a 24
  for i,r in ipairs(basket) do if #r<24 then basket[i]=r..string.rep(".",24-#r) elseif #r>24 then basket[i]=r:sub(1,24) end end
  for _,y in ipairs{12,8,4} do o:rows(2,y,basket,lg) end
  o:rows(8,0,{"KKKKKKKKKKKK","KhhhhhhhhhhK","KdK......KdK","KdK......KdK"},lg)
  o:save(OUT.."cestas.png")
end
-- ===== planta 16x24
do
  local o=L.new(16,24)
  local lg={K=K,h="63c74d",g="3e8948",d="265c42",t="d77643",u="b86f50",v="733e39",s="3e2731",e="ead4aa"}
  o:rows(0,0,{
  "......K...K.....",
  ".....KhK.KhK.K..",
  ".K...KhgKKhgKhK.",
  "KhK..KhgKKhgKhgK",
  "KhgK.KhggKhgKhgK",
  "KhggKKhggKhgKhgK",
  ".KhgKKhggKhgKggK",
  ".KhggKhggKhgKgK.",
  "..KhgKKhgKgKgK..",
  "...KgKKhgKgKK...",
  "....KKKhgKgK....",
  ".....KKKgKK.....",
  ".....KKKKKK.....",
  "...KKKKKKKKKK...",
  "...KeettttuuK...",
  "...KKKKKKKKKK...",
  "....KtttttuK....",
  "....KtttttuK....",
  "....KtttttuK....",
  "....KtttttuK....",
  "....KttttuvK....",
  "....KtttuuvK....",
  ".....KuuuvK.....",
  ".....KKKKKK....."},lg)
  o:save(OUT.."planta.png")
end
-- ===== cartel 48x16
do
  local o=L.new(48,16)
  -- cadenas
  for _,x in ipairs{9,38} do
    for y=0,4 do o:px(x,y,(y%2==0) and "8b9bb4" or "5a6988"); o:px(x+1,y,(y%2==0) and "5a6988" or "8b9bb4") end
    o:px(x,0,"8b9bb4"); o:px(x+1,0,"8b9bb4")
  end
  o:rect(0,5,48,11,K)
  o:rect(1,6,46,9,"feae34")
  o:rect(1,6,46,1,"fee761"); o:rect(1,6,1,9,"fee761")
  o:rect(1,14,46,1,"f77622"); o:rect(46,6,1,9,"f77622")
  o:frame(3,8,42,5,"f77622")
  o:rect(4,9,40,3,"feae34")
  o:rect(4,9,40,1,"fee761")
  for _,p in ipairs{{2,7},{45,7},{2,13},{45,13}} do o:px(p[1],p[2],"8b9bb4") end
  o:px(0,5,""); o:px(47,5,""); o:px(0,15,""); o:px(47,15,"")
  o:save(OUT.."cartel-caja.png")
end
print("ok")
