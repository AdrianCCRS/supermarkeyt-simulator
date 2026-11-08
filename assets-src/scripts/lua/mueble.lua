local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local K="181425"
local OUT=L.ROOT.."public/assets/img/tienda/"
-- ============ MUEBLE TRASERO 28x52
do
  local o=L.new(28,52)
  o:rect(0,0,28,52,K)
  o:rect(1,1,26,50,"3a4466")
  o:rect(1,1,1,50,"5a6988")                 -- luz izquierda
  o:rect(26,1,1,50,"262b44")
  o:rect(3,6,22,44,"262b44")                -- fondo interior
  -- cenefa roja y0..5
  for x=1,26 do
    local c=(math.floor((x-1)/3)%2==0)
    o:px(x,1,c and "e43b44" or "ead4aa"); o:px(x,2,c and "e43b44" or "ead4aa")
    o:px(x,3,c and "a22633" or "c28569"); o:px(x,4,c and "be4a2f" or "c28569")
  end
  o:rect(1,5,26,1,"5a6988")
  local C={
   red={"f6757a","e43b44","a22633"}, yel={"fee761","feae34","f77622"}, blu={"2ce8f5","0099db","124e89"},
   grn={"63c74d","3e8948","265c42"}, pnk={"f6757a","b55088","68386c"}, org={"feae34","f77622","be4a2f"}, cyn={"ffffff","2ce8f5","0099db"}}
  local function box(x,yb,w,h,c)
    local t=yb-h+1
    o:rect(x,t,w,h,K); o:rect(x+1,t+1,w-2,h-2,c[2])
    o:rect(x+1,t+1,1,h-2,c[1]); o:rect(x+w-2,t+1,1,h-2,c[3])
    o:rect(x+1,t+math.floor(h/2),w-2,1,"ffffff")      -- franja lisa
  end
  local function bag(x,yb,w,h,c)
    local t=yb-h+1
    o:rect(x,t+2,w,h-2,K); o:rect(x+1,t+3,w-2,h-4,c[2])
    o:rect(x+1,t+3,1,h-4,c[1]); o:rect(x+w-2,t+3,1,h-4,c[3])
    -- cierre superior con dientes
    for i=0,w-1 do o:px(x+i,t,(i%2==0) and K or "") ; o:px(x+i,t+1,K) end
    o:rect(x+1,t+4,w-2,1,"ffffff")
  end
  local lv={
   {{"box",5,8,"red"},{"bag",5,9,"yel"},{"box",4,7,"blu"},{"bag",5,8,"grn"}},
   {{"bag",5,8,"pnk"},{"box",5,9,"org"},{"box",4,8,"cyn"},{"bag",5,9,"yel"}},
   {{"box",6,8,"grn"},{"box",4,9,"red"},{"bag",5,7,"blu"},{"box",4,8,"pnk"}},
   {{"bag",5,9,"yel"},{"box",5,8,"cyn"},{"box",4,9,"org"},{"bag",5,8,"grn"}}}
  for k=0,3 do
    local top=6+11*k
    local x=3
    for _,it in ipairs(lv[k+1]) do
      local kind,w,h,cn=it[1],it[2],it[3],it[4]
      if kind=="box" then box(x,top+8,w,h,C[cn]) else bag(x,top+8,w,h,C[cn]) end
      x=x+w+1
    end
    o:rect(3,top+9,22,1,"5a6988"); o:rect(3,top+10,22,1,"3a4466")
  end
  o:rect(1,50,26,1,"3a4466")
  o:save(OUT.."mueble-trasero.png")
end
-- ============ LUZ CARRIL 28x32
do
  local o=L.new(28,32)
  -- cable y clip de techo
  o:rect(11,0,6,2,K); o:rect(12,0,4,1,"c0cbdc"); o:rect(12,1,4,1,"8b9bb4")
  for y=2,5 do o:px(13,y,"c0cbdc"); o:px(14,y,"5a6988") end
  -- caja
  o:rect(3,6,22,18,K)
  o:rect(4,7,20,16,"0099db")
  o:rect(4,7,20,1,"2ce8f5"); o:rect(4,7,1,16,"2ce8f5")
  o:rect(23,8,1,15,"124e89"); o:rect(5,22,19,1,"124e89")
  o:rect(6,8,16,14,"193c3e")
  -- base redondeada
  o:rect(12,24,4,2,K); o:rect(13,24,2,2,"0099db"); o:px(13,24,"2ce8f5")
  o:rows(6,26,{
   "....KKKKKKKK....",
   "..KKhhbbbbbbKK..",
   ".KhhbbbbbbbbbdK.",
   "KhbbbbbbbbbbbddK",
   "KbbbbbbbbbbbbddK",
   "KKKKKKKKKKKKKKKK"},{K=K,h="2ce8f5",b="0099db",d="124e89"})
  o:save(OUT.."luz-carril.png")
end
print("ok")
