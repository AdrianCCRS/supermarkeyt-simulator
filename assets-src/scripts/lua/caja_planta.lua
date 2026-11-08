local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local K="181425"
local o=L.new(28,28)
-- pantalla/cartel visto desde arriba (franja roja trasera con el canto de la pantalla)
o:rect(3,0,22,6,K); o:rect(4,1,20,4,"e43b44")
o:rect(4,1,20,1,"f6757a"); o:rect(4,1,1,4,"f6757a"); o:rect(23,2,1,3,"a22633"); o:rect(5,4,18,1,"a22633")
o:rect(7,2,14,1,"193c3e")                      -- canto de la pantalla
-- cuerpo: tapa superior crema
o:rect(1,6,26,17,K); o:rect(2,7,24,15,"ead4aa")
o:rect(2,7,24,1,"ffffff"); o:rect(2,7,1,15,"ffffff")
o:rect(25,8,1,14,"e4a672"); o:rect(3,21,22,1,"e4a672")
-- impresora de tickets (izquierda): bloque gris con papel que sale hacia atras
o:rect(4,5,4,3,"ffffff"); o:rect(4,5,4,1,K); o:rect(4,5,1,3,K); o:rect(7,5,1,3,K)
o:rect(3,8,6,12,K); o:rect(4,9,4,10,"8b9bb4"); o:rect(4,9,4,1,"c0cbdc"); o:rect(4,9,1,10,"c0cbdc"); o:rect(7,10,1,9,"5a6988")
o:rect(5,11,2,1,K); o:px(5,17,"63c74d"); o:px(7,17,"e43b44")
-- teclado: placa de madera con teclas
o:rect(11,8,14,12,"b86f50"); o:frame(11,8,14,12,"733e39")
for ky=0,2 do for kx=0,3 do o:rect(13+kx*3,10+ky*3,2,2,"e4a672") end end
o:rect(13,18,10,1,"e4a672")                    -- barra espaciadora
-- canto frontal: cajon rojo con tirador
o:rect(1,22,26,6,K); o:rect(2,23,24,4,"e43b44")
o:rect(2,23,24,1,"f6757a"); o:rect(2,26,24,1,"a22633")
o:rect(11,24,6,2,"8b9bb4"); o:rect(11,24,6,1,"c0cbdc"); o:rect(11,25,6,1,"5a6988"); o:rect(11,24,1,2,K); o:rect(16,24,1,2,K)
o:px(1,27,""); o:px(26,27,""); o:px(1,22,K)
o:save(L.ROOT.."public/assets/img/tienda/mini-caja-planta.png")
print("ok")
