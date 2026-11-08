local R="/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/"
local I=R.."public/assets/img/"
local P={"be4a2f","d77643","ead4aa","e4a672","b86f50","733e39","3e2731","a22633","e43b44","f77622","feae34","fee761","63c74d","3e8948","265c42","193c3e","124e89","0099db","2ce8f5","ffffff","c0cbdc","8b9bb4","5a6988","3a4466","262b44","181425","ff0044","68386c","b55088","f6757a","e8b796","c28569"}
local spr=Sprite(160,270,ColorMode.RGB)
local p=spr.palettes[1]; p:resize(#P)
for i,h in ipairs(P) do p:setColor(i-1,Color(tonumber(h:sub(1,2),16),tonumber(h:sub(3,4),16),tonumber(h:sub(5,6),16))) end
local list={{"mueble-trasero","tienda/mueble-trasero.png",66,168},{"nevera-barrera","tienda/nevera-barrera.png",40,150},{"mostrador-caja","tienda/mostrador-caja.png",96,56},{"luz-carril","tienda/luz-carril.png",122,34},{"cajero (referencia)","characters/cajero.png",64,220}}
spr.layers[1].name=list[1][1]
spr:newCel(spr.layers[1],1,Image{fromFile=I..list[1][2]},Point(list[1][3],list[1][4]))
for i=2,#list do local l=spr:newLayer(); l.name=list[i][1]; spr:newCel(l,1,Image{fromFile=I..list[i][2]},Point(list[i][3],list[i][4])) end
spr:saveAs(R.."assets-src/puesto-caja.aseprite")
print("ok")
