local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local K="181425"
local base={K=K,W="ffffff",w="c0cbdc",v="8b9bb4",u="5a6988"}
local function mix(t) local r={} for k,v in pairs(base) do r[k]=v end for k,v in pairs(t) do r[k]=v end return r end
local ICONS={}
local function icon(name,rows,leg) ICONS[#ICONS+1]={name,rows,mix(leg or {})} end

-- lac-002: pack de 4 yogures
local cup1={"KKKKKKK","K22222K","K00000K","KWWWwwK","KWWwwwK",".KWwwK.","..KKK.."}
local rows={"................"}
local function two(a) return "."..a..a.."." end
for _,pass in ipairs{1,2} do for i=1,7 do rows[#rows+1]=two(cup1[i]) end end
rows[16]=nil
icon("lac-002",rows,{["2"]="2ce8f5",["0"]="0099db"})

-- car-001: bandeja con pechuga de pollo
icon("car-001",{
"................",
"................",
"................",
".KKKKKKKKKKKKKK.",
"KWWWWWWWWWWWWWWK",
"KWwKKKKKKKKKKwvK",
"KWKppppppppppKvK",
"KWKpqppppppppKvK",
"KWKpppppppppdKvK",
"KWKdppppppdddKvK",
"KWwKKdddddKKwwvK",
"KwwwwwwwwwwwwvvK",
".KvvvvvvvvvvvvK.",
"..KKKKKKKKKKKK..",
"................",
"................"},{p="f6757a",q="e8b796",d="c28569"})
-- (la envoltura de plastico se sugiere con el brillo blanco)

-- car-002: bandeja con carne molida
icon("car-002",{
"................",
"................",
"................",
".KKKKKKKKKKKKKK.",
"KWWWWWWWWWWWWWWK",
"KWwKKKKKKKKKKwvK",
"KWKrrhrrrrhrrKvK",
"KWKrrrrdrrrrrKvK",
"KWKhrrrrrdrrhKvK",
"KWKrdrrhrrrrrKvK",
"KWwKKdddddKKwwvK",
"KwwwwwwwwwwwwvvK",
".KvvvvvvvvvvvvK.",
"..KKKKKKKKKKKK..",
"................",
"................"},{r="a22633",h="be4a2f",d="3e2731"})

-- car-003: filete de salmon
icon("car-003",{
"................",
"................",
"................",
"......KKKKKK....",
"...KKKssssssKK..",
"..KssWsssWssssK.",
".KsssWssWsssssK.",
".KshsWssWssssdK.",
"KshhssWsWsssddK.",
"KshhssWssWsdddK.",
"KsssssWssWdddK..",
".KddssWssdddKK..",
"..KKdddddKKK....",
"....KKKKKK......",
"................",
"................"},{s="f6757a",h="e8b796",d="d77643"})

-- des-001: bolsa de arroz
icon("des-001",{
"................",
"..KKKKKKKKKKKK..",
"..KWwWwWwWwWwK..",
"..KKKKKKKKKKKK..",
".KWWWWWWWWWWwvK.",
".KWWWWWWWWWwwvK.",
".KW000000000wvK.",
".KW011111110wvK.",
".KW01WWW1WW0wvK.",
".KW011111110wvK.",
".KW000000000wvK.",
".KWWWWWWWWWwvvK.",
".KWWWWWWWWwwvvK.",
".KwwwwwwwwwwvvK.",
"..KKKKKKKKKKKK..",
"................"},{["0"]="0099db",["1"]="124e89"})

-- des-002: paquete de espagueti con ventana
icon("des-002",{
"....KKKKKKKK....",
"....KKKKKKKK....",
"...KfffffffhK...",
"...KfffffffhK...",
"...KKKKKKKKKK...",
"...KfKWWWWKhK...",
"...KfKyWyWKhK...",
"...KfKWyWyKhK...",
"...KfKyWyWKhK...",
"...KfKWyWyKhK...",
"...KfKKKKKKhK...",
"...KfffffffhK...",
"...KrrrrrrrrK...",
"...KfffffffhK...",
"....KKKKKKKK....",
"................"},{f="feae34",h="f77622",y="fee761",r="be4a2f"})

-- des-003: botella de aceite de oliva
icon("des-003",{
"................",
".....KKKKKK.....",
".....KuuuuK.....",
".....KuuuuK.....",
".....KKKKKK.....",
"......KgGK......",
".....KgGGdK.....",
"....KhgGGGdK....",
"....KhgWWGdK....",
"....KhgWWGdK....",
"....KhgGGGdK....",
"....KhgGGGdK....",
"....KhggGGdK....",
"....KgGGGGdK....",
".....KKKKKK.....",
"................"},{g="63c74d",G="3e8948",d="265c42",h="fee761",u="3a4466"})
-- (G/g invertidos en el cuello: tonos verde-amarillo)

-- beb-001: botella de agua
icon("beb-001",{
"................",
".....KKKKKK.....",
".....K1111K.....",
".....K1111K.....",
".....KKKKKK.....",
"......K22K......",
".....K2WW0K.....",
"....K2WW000K....",
"....KW2WW00K....",
"....KKKKKKKK....",
"....KW22200K....",
"....K2WW000K....",
"....K2W2000K....",
"....K2200000K...",
".....KKKKKKK....",
"................"},{["1"]="124e89",["2"]="2ce8f5",["0"]="0099db"})

-- lim-001: botella de detergente con asa y tapa roja
icon("lim-001",{
"................",
"....KKKK........",
"....KrrK........",
"...KKrdKKKK.....",
"...KbbbbbbbK....",
"..KbbhhbbbbK....",
"..KbhhbbKKbbK...",
"..KbhbbbK.KbK...",
"..KbhWWWWKKbK...",
"..KbhWWWWbbbK...",
"..KbhbbbbbbdK...",
"..KbbbbbbbbdK...",
"..KbbbbbbbddK...",
"...KddddddddK...",
"....KKKKKKKK....",
"................"},{r="e43b44",d="124e89",b="0099db",h="2ce8f5"})
do
  local c={".KKKKK.","KWWWwwK","KWKKKwK","KWKcKvK","KWKKKvK","KwwvvvK",".KKKKK."}
  local rr={}
  rr[1]="................"
  for i=1,7 do rr[#rr+1]="....."..c[i].."....".."" end
  for i=1,7 do rr[#rr+1]=c[i]..c[i].."."..".." end
  -- normaliza longitudes
  for i,r in ipairs(rr) do if #r<16 then rr[i]=r..string.rep(".",16-#r) elseif #r>16 then rr[i]=r:sub(1,16) end end
  for i=2,8 do rr[i]="....."..c[i-1].."...." end
  for i=9,15 do rr[i]="."..c[i-8]..c[i-8].."." end
  rr[16]="................"
  icon("lim-002",rr,{c="c28569"})
end
icon("hig-001",{
"................",
".....KKKK.......",
".....KWwK.......",
".....KWwK.......",
"....KKKKKK......",
"....KhhppK......",
"...KhhpppdK.....",
"...KhpWWpdK.....",
"...KhpWWpdK.....",
"...KhpppppdK....",
"...KhppppddK....",
"...KhpppdddK....",
"...KppdddddK....",
"....KKKKKKK.....",
"................",
"................"},{h="f6757a",p="b55088",d="68386c"})

local OUTDIR=L.ROOT.."public/assets/img/icons/"
for _,ic in ipairs(ICONS) do
  local name,rws,lg=ic[1],ic[2],ic[3]
  while #rws<16 do rws[#rws+1]="................" end
  for i,r in ipairs(rws) do if #r~=16 then print("BAD ROW",name,i,#r,r) end end
  local o=L.new(16,16); o:rows(0,0,rws,lg); o:save(OUTDIR..name..".png")
end
print("ok")
