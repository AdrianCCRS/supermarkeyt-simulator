-- Logo parodia "Tiendas D2": grande 64x80, mini 32x40, horizontal 96x24
local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local RED,DRED,WH,GR,OUT="e43b44","a22633","ffffff","c0cbdc","181425"
local YEL,YEL2,ORG,BLU="fee761","feae34","f77622","124e89"

local G={
T={"######","######","..##..","..##..","..##..","..##..","..##..","..##..","..##.."},
i={"##","  ","##","##","##","##","##","##"},
}
-- glifos: filas desde la altura 0; x-height letras empiezan en fila 3
local GL={
 T={0,{"######","######","..##..","..##..","..##..","..##..","..##..","..##..","..##.."}},
 i={0,{"##","##",".." ,"##","##","##","##","##","##"}},
 e={3,{".####.","##..##","######","##....","##..##",".####."}},
 n={3,{"#####.","######","##..##","##..##","##..##","##..##"}},
 d={0,{"....##","....##","....##",".#####","##..##","##..##","##..##","##..##",".#####"}},
 a={3,{".####.","....##",".#####","##..##","##..##",".#####"}},
 s={3,{".#####","##....",".####.","....##","....##","#####."}},
}
local function word(o,x,y,gap,col,shadow)
  local cx=x
  local pos={}
  for ch in ("Tiendas"):gmatch(".") do
    local g=GL[ch]; local w=#g[2][1]
    table.insert(pos,{g,cx}); cx=cx+w+gap
  end
  for pass=1,2 do
    for _,p in ipairs(pos) do
      local g,gx=p[1],p[2]
      for r,row in ipairs(g[2]) do for c=1,#row do
        if row:sub(c,c)=="#" then
          if pass==1 then o:px(gx+c-1+1,y+g[1]+r-1+1,shadow) else o:px(gx+c-1,y+g[1]+r-1,col) end
        end end end
    end
  end
  return cx-gap-x
end
local function wordWidth(gap) local w=0 for ch in ("Tiendas"):gmatch(".") do w=w+#GL[ch][2][1]+gap end return w-gap end

local D2big={".######.","########","##....##","......##","....###.","..####..",".###....","###.....","##......","########","########"}
local D2small={".###.","##.##","...##","..##.",".##..","##...","#####"}

local function dshape(xs,y0,H,T,sh)
  local R=H/2; local flat=math.floor(R*0.75+0.5); local c=(H-1)/2
  return function(x,y)
    local v=y-y0; if v<0 or v>=H then return false end
    local u=x-xs-math.floor((H-1-v)*sh+0.5)
    if u<0 then return false end
    local function inside(rad,uu,vv)
      if uu<=flat then return true end
      return (uu-flat)^2+(vv-c)^2<=rad*rad
    end
    if not inside(R,u,v) then return false end
    -- hueco
    if u>=T and v>=T and v<=H-1-T then
      local hr=R-T
      if u<=flat or (u-flat)^2+(v-c)^2<hr*hr then return false end
    end
    return true
  end
end

local function circle(o,cx,cy,d,digit,dsh,smile)
  local r=d/2
  local inner=r-2
  for y=cy-d,cy+d do for x=cx-d,cx+d do
    local dx,dy=x+0.5-cx,y+0.5-cy; local dist=math.sqrt(dx*dx+dy*dy)
    if dist<=r then
      if dist>r-1 then o:px(x,y,OUT)
      elseif dist>r-2 then o:px(x,y,ORG)
      else o:px(x,y,((dx+dy)>=inner*0.75) and YEL2 or YEL) end
    end
  end end
  local h=#digit; local w=#digit[1]
  local ty=math.floor(cy-(smile and (h+4)/2 or h/2)+0.5)
  local tx=math.floor(cx-w/2+0.5)
  for r2,row in ipairs(digit) do
    local sx=math.floor((h-r2)*dsh+0.5)
    for c=1,w do if row:sub(c,c)=="#" then o:px(tx+c-1+sx-math.floor(h*dsh/2+0.5),ty+r2-1,BLU) end end
  end
  if smile then
    local sy=ty+h+2; local sx=math.floor(cx-3+0.5)
    o:px(sx,sy,OUT); o:px(sx+5,sy,OUT)
    for i=1,4 do o:px(sx+i,sy+1,OUT) end
  end
end

local function base(w,h,inset)
  local o=L.new(w,h)
  o:rect(0,0,w,h,OUT)
  o:rect(1,1,w-2,h-2,RED)
  o:rect(w-3,2,2,h-3,DRED); o:rect(2,h-3,w-3,2,DRED)  -- sombra roja der/abajo
  o:rect(1,1,w-2,1,RED)
  o:frame(inset,inset,w-2*inset,h-2*inset,WH)
  -- recoloca zona interior lisa roja
  o:rect(inset+1,inset+1,w-2*inset-2,h-2*inset-2,RED)
  o:rect(w-inset-3,inset+1,2,h-2*inset-2,DRED)
  o:rect(inset+1,h-inset-3,w-2*inset-2,2,DRED)
  o:frame(inset,inset,w-2*inset,h-2*inset,WH)
  return o
end

local function drawD(o,f,x0,x1,y0,y1)
  -- sombra (2,2), cuerpo y sombreado de borde
  for y=y0,y1 do for x=x0,x1 do
    if not f(x,y) and f(x-2,y-2) then o:px(x,y,DRED) end
  end end
  for y=y0,y1 do for x=x0,x1 do
    if f(x,y) then
      local edge=(not f(x+1,y)) or (not f(x,y+1))
      o:px(x,y,edge and GR or WH)
    end
  end end
end
-- la sombra roja oscura solo sobre rojo (no sobre filete), la D no pisa filete: se acota por rangos

-- GRANDE
local function big()
  local o=base(64,80,2)
  local w=wordWidth(2); word(o,math.floor((64-w)/2),6,2,WH,DRED)
  local f=dshape(4,26,44,12,0.36)
  drawD(o,f,4,59,25,70)
  circle(o,48,30,25,D2big,0.3,true)
  return o
end
local function mini()
  local o=base(32,40,1)
  local f=dshape(3,14,22,6,0.4)
  drawD(o,f,2,29,14,36)
  circle(o,21,11,15,D2small,0.2,false)
  return o
end
local function horiz()
  local o=base(96,24,1)
  local w=wordWidth(2); word(o,4,7,2,WH,DRED)
  local f=dshape(58,4,18,5,0.3)
  drawD(o,f,55,93,4,21)
  circle(o,85,9,14,D2small,0.2,false)
  return o
end
local pieces={{"logo-d2",big()},{"logo-d2-mini",mini()},{"logo-d2-horizontal",horiz()}}
local dir=L.ROOT.."public/assets/img/entorno/"
for _,p in ipairs(pieces) do p[2]:save(dir..p[1]..".png") end
-- fuente .aseprite: una capa por pieza
local spr=Sprite(200,84,ColorMode.RGB)
local pal=spr.palettes[1]; pal:resize(#L.PAL)
for i,h in ipairs(L.PAL) do local c=L.col(h); pal:setColor(i-1,Color(app.pixelColor.rgbaR(c),app.pixelColor.rgbaG(c),app.pixelColor.rgbaB(c))) end
local offs={{0,0},{70,0},{104,0}}
for k,p in ipairs(pieces) do
  local layer=(k==1) and spr.layers[1] or spr:newLayer()
  layer.name=p[1]
  spr:newCel(layer,1,p[2].img,Point(offs[k][1],offs[k][2]))
end
spr:saveAs(L.ROOT.."assets-src/logo-d2.aseprite")
