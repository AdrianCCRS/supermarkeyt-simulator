local L={}
L.ROOT="/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/"
L.OUT="/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/out/"
L.PAL={"be4a2f","d77643","ead4aa","e4a672","b86f50","733e39","3e2731","a22633","e43b44","f77622","feae34","fee761","63c74d","3e8948","265c42","193c3e","124e89","0099db","2ce8f5","ffffff","c0cbdc","8b9bb4","5a6988","3a4466","262b44","181425","ff0044","68386c","b55088","f6757a","e8b796","c28569"}
local function col(h)
  if h==nil or h=="" then return 0 end
  local r=tonumber(h:sub(1,2),16); local g=tonumber(h:sub(3,4),16); local b=tonumber(h:sub(5,6),16)
  return app.pixelColor.rgba(r,g,b,255)
end
L.col=col
local O={} ; O.__index=O
function L.new(w,h) local o=setmetatable({w=w,h=h,img=Image(w,h,ColorMode.RGB)},O); return o end
function O:px(x,y,c) if x>=0 and y>=0 and x<self.w and y<self.h then self.img:putPixel(x,y,col(c)) end end
function O:rect(x,y,w,h,c) for j=y,y+h-1 do for i=x,x+w-1 do self:px(i,j,c) end end end
function O:frame(x,y,w,h,c) self:rect(x,y,w,1,c) self:rect(x,y+h-1,w,1,c) self:rect(x,y,1,h,c) self:rect(x+w-1,y,1,h,c) end
function O:rows(x,y,rows,leg) for j,r in ipairs(rows) do for i=1,#r do local ch=r:sub(i,i); local c=leg[ch]; if c then self:px(x+i-1,y+j-1,c) end end end end
function O:blit(x,y,path)
  local im=Image{fromFile=path}
  for j=0,im.height-1 do for i=0,im.width-1 do local p=im:getPixel(i,j); if app.pixelColor.rgbaA(p)>0 then self:px(x+i,y+j,string.format("%02x%02x%02x",app.pixelColor.rgbaR(p),app.pixelColor.rgbaG(p),app.pixelColor.rgbaB(p))) end end end
end
function O:save(name)
  local spr=Sprite(self.w,self.h,ColorMode.RGB)
  local pal=spr.palettes[1]; pal:resize(#L.PAL); for i,h in ipairs(L.PAL) do local c=col(h); pal:setColor(i-1,Color(app.pixelColor.rgbaR(c),app.pixelColor.rgbaG(c),app.pixelColor.rgbaB(c))) end
  spr:newCel(spr.layers[1],1,self.img,Point(0,0))
  spr:saveAs(name); spr:close()
end

-- coloca iconos del pack en una fila: apoyados con su ultima fila opaca en yb, repartidos entre x0 y x1 (inclusive)
L.placed={}
function L.bbox(im)
  local x0,y0,x1,y1=99,99,-1,-1
  for j=0,im.height-1 do for i=0,im.width-1 do if app.pixelColor.rgbaA(im:getPixel(i,j))>0 then
    if i<x0 then x0=i end if j<y0 then y0=j end if i>x1 then x1=i end if j>y1 then y1=j end end end end
  return x0,y0,x1,y1
end
function O:row(x0,x1,yb,names,tag,ox,oy)
  local ims,tot={},0
  for k,n in ipairs(names) do
    local cat,nm=n:match("([^/]+)/(.+)")
    local path=L.ROOT.."assets-src/iconos-pack/"..cat.."/"..nm..".png"
    local im=Image{fromFile=path}; local bx0,by0,bx1,by1=L.bbox(im)
    ims[k]={im=im,bx0=bx0,by1=by1,w=bx1-bx0+1,nm=nm,path=path}; tot=tot+ims[k].w
  end
  local space=(x1-x0+1)-tot; local n=#names
  local gap=math.floor(space/(n+1)); local extra=space-gap*(n+1)
  local x=x0+gap+math.floor(extra/2)
  for k,it in ipairs(ims) do
    local ix=x-it.bx0; local iy=yb-it.by1
    self:blit(ix,iy,it.path)
    table.insert(L.placed,{it.nm,(ox or 0)+ix,(oy or 0)+iy,tag})
    x=x+it.w+gap
  end
end
function L.dumpPlaced(name)
  local f=io.open(L.OUT..name,"w"); for _,p in ipairs(L.placed) do f:write(p[1].." "..p[2].." "..p[3].."\n") end f:close()
end
return L
