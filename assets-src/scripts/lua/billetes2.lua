local ROOT="/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/"
local pc=app.pixelColor
local function C(h) return pc.rgba(tonumber(h:sub(1,2),16),tonumber(h:sub(3,4),16),tonumber(h:sub(5,6),16),255) end
local K=C("181425")
local function new(w,h) return Image(w,h) end
local function put(im,x,y,p) if x>=0 and y>=0 and x<im.width and y<im.height then im:drawPixel(x,y,p) end end
local function R(im,x,y,w,h,c) for j=y,y+h-1 do for i=x,x+w-1 do put(im,i,j,c) end end end
local function ascii(im,x,y,rows,leg)
  for j,r in ipairs(rows) do
    assert(#r==#rows[1], "fila de ancho distinto: "..r)
    for i=1,#r do local ch=r:sub(i,i); if ch~="." then
      local c=leg[ch]; assert(c, "sin color para '"..ch.."'"); put(im,x+i-1,y+j-1,c) end end
  end
end
local function L(t) local r={} for k,v in pairs(t) do r[k]=(v=="K") and K or C(v) end return r end

-- ===== bustos 10x12
local BUST={
 -- 1 Debora Arango: mujer, melena corta oscura enmarcando la cara, vestido
 {rows={"..KKKKKK..",".KhhhhhhK.","KhhhhhhhhK","KhhssssshK","KhsEssEshK","KhsssssshK","KhhsddsshK",".KhsssshK.","..KKssKK..",".KccsssccK","KccllcclcK","KKKKKKKKKK"},
  leg=L{K="K",E="K",s="e8b796",d="c28569",h="733e39",c="124e89",l="0099db"}},
 -- 2 Silva: pelo oscuro peinado, bigote ancho, cuello alto y lazo
 {rows={"..KKKKKK..",".KhhhhhhK.",".KhhssshK.",".KssssssK.",".KsEssEsK.",".KssddssK.",".KmmmmmmK.","..KsssdK..","...KssK...",".KwwwwwwK.","KcctttcccK","KKKKKKKKKK"},
  leg=L{K="K",E="K",s="e8b796",d="c28569",h="3e2731",m="3e2731",w="ffffff",c="3e2731",t="a22633"}},
 -- 3 Virginia Gutierrez: mujer con mono alto, pendientes y labios
 {rows={"...KKKK...","..KhhhhK..",".KhhhhhhK.",".KssssssK.",".KsEssEsK.",".KssssssK.","yKssRRssKy","..KssssK..","...KssK...",".KccsssccK","KccllcclcK","KKKKKKKKKK"},
  leg=L{K="K",E="K",s="e8b796",d="c28569",h="3e2731",c="b55088",l="f6757a",R="a22633",y="feae34"}},
 -- 4 Lopez Michelsen: perfil mirando a la derecha, entradas, nariz marcada, corbata
 {rows={"..KKKKK...",".KhhhhhK..","KhhhssssK.","KhhsssssK.","KhsssEssK.","KhssssssdK","KhhsssssK.",".KhsssmK..","..KsssK...","..KsssKK..",".KcwtcccK.","KKKKKKKKKK"},
  leg=L{K="K",E="K",s="e8b796",d="c28569",h="8b9bb4",m="c28569",w="ffffff",c="3a4466",t="e43b44"}},
 -- 5 Garcia Marquez: pelo canoso muy voluminoso, bigote, chaqueta de solapas
 {rows={".KKKKKKKK.","KggggggggK","KgghhhhggK","KgssssssgK","KgsEssEsgK","KgssddssgK",".KsmmmmsK.","..KssssK..","...KssK...",".KlcsscclK","KccllllccK","KKKKKKKKKK"},
  leg=L{K="K",E="K",s="e8b796",d="c28569",g="c0cbdc",h="8b9bb4",m="5a6988",c="262b44",l="3a4466"}},
 -- 6 Lleras Restrepo: frente despejada, gafas redondas, orejas, traje y corbata
 {rows={"..KKKKKK..",".KsggssssK",".KssssssK.","KhsssssshK","KhEEssEEhK","KhsEssEshK",".KssddssK.","..KssssK..","...KwwK...",".KwwwwwwK.","KccwttwccK","KKKKKKKKKK"},
  leg=L{K="K",E="K",s="e8b796",d="c28569",g="ead4aa",h="8b9bb4",w="ffffff",c="193c3e",t="a22633"}},
}
-- ===== motivos 5x12
local MOT={
 {rows={"..g..",".gGg.","gGGGg",".gGg.","..k..","g.k.g","gGkGg",".gkg.","..k..","..k..",".kkk.","kkkkk"},leg=L{g="3e8948",G="265c42",k="124e89"}},
 {rows={".www.","wwyww","wwyww",".www.","..k..","..kl.",".lkll",".lk..","..k..","..k..","..w..","..k.."},leg=L{w="ead4aa",y="feae34",k="733e39",l="3e8948"}},
 {rows={"..oo.",".ooEo","KooOO",".oOOO","wwOO.",".wwO.","..O..","kkkkk","g.k.g",".gkg.","..k..","..k.."},leg=L{o="f77622",O="be4a2f",E="K",K="K",w="feae34",k="733e39",g="63c74d"}},
 {rows={"g.g.g","ggGgg",".gGg.","..t..","..t..","..t..","..t..","..t..","..t..","g.t.g","ggtgg","GGGGG"},leg=L{g="63c74d",G="3e8948",t="733e39"}},
 {rows={"p.k.p","ppkpp","pPkPp",".pkp.","..k..",".....",".fff.","ffyff",".fff.","..g..","..g..",".ggg."},leg=L{p="f6757a",P="b55088",k="181425",f="f6757a",y="fee761",g="3e8948"}},
 {rows={"g.G.g",".gGg.","ggtgg","g.t.g","..t..","..t..","..t..","..t..","..t..",".gtg.","ggggg","kkkkk"},leg=L{g="63c74d",G="3e8948",t="733e39",k="265c42"}},
}
-- ===== billetes: base, pat(oscuro), zona, brillo
local BIL={
 {base="2ce8f5",pat="0099db",dk="124e89",zone="ffffff",fn=function(x,y) return (x+y)%6==0 or (x-y)%6==0 end},
 {base="b86f50",pat="733e39",dk="733e39",zone="ead4aa",fn=function(x,y) return y%3==1 end},
 {base="e43b44",pat="a22633",dk="a22633",zone="f6757a",fn=function(x,y) return (x+y)%4==0 end},
 {base="fee761",pat="feae34",dk="f77622",zone="ffffff",fn=function(x,y) return x%4==0 end},
 {base="68386c",pat="262b44",dk="262b44",zone="b55088",fn=function(x,y) return x%3==0 and y%3==0 end},
 {base="63c74d",pat="3e8948",dk="265c42",zone="ead4aa",fn=function(x,y) return (x-y)%5==0 end},
}
local layers={"base","marco","busto","ornamentos","brillos"}
local LI={}
for _,n in ipairs(layers) do LI[n]=new(228,18) end
local out=new(228,18)
for i,b in ipairs(BIL) do
  local ox=(i-1)*38
  local L_={} for _,n in ipairs(layers) do L_[n]=new(38,18) end
  local base,pat,dk,zone=C(b.base),C(b.pat),C(b.dk),C(b.zone)
  -- base + patron
  R(L_.base,1,1,36,16,base)
  for y=2,15 do for x=2,35 do if b.fn(x,y) then put(L_.base,x,y,pat) end end end
  R(L_.base,14,5,18,8,zone)
  -- marco: contorno, borde de sombra
  R(L_.marco,0,0,38,18,K); R(L_.marco,1,1,36,16,0)
  for _,p in ipairs{{0,0},{37,0},{0,17},{37,17}} do put(L_.marco,p[1],p[2],0) end
  R(L_.marco,1,16,36,1,dk); R(L_.marco,36,2,1,14,dk)
  -- brillos: borde claro arriba/izquierda + esquina
  R(L_.brillos,1,1,35,1,zone); R(L_.brillos,1,1,1,15,zone)
  -- busto y motivo
  ascii(L_.busto,2,3,BUST[i].rows,BUST[i].leg)
  ascii(L_.ornamentos,32,3,MOT[i].rows,MOT[i].leg)
  for _,n in ipairs{"base","ornamentos","busto","marco","brillos"} do
    out:drawImage(L_[n],Point(ox,0))
    LI[n]:drawImage(L_[n],Point(ox,0))
  end
end
local s=Sprite(228,18); s.cels[1].image:drawImage(out,Point(0,0)); s:saveAs(ROOT.."public/assets/img/caja/billetes.png"); s:close()

-- fuente: 6 frames x 5 capas
do
  local spr=Sprite(38,18)
  spr.layers[1].name=layers[1]
  for i=2,#layers do local l=spr:newLayer(); l.name=layers[i] end
  for f=2,6 do spr:newFrame(spr.frames[#spr.frames]) end
  for _,cel in ipairs(spr.cels) do spr:deleteCel(cel) end
  for li,n in ipairs(layers) do
    for f=1,6 do
      local im=new(38,18); im:drawImage(LI[n],Point(-(f-1)*38,0))
      spr:newCel(spr.layers[li],f,im,Point(0,0))
    end
  end
  spr:saveAs(ROOT.."assets-src/billetes.aseprite")
end
print("ok")
