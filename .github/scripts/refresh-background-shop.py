from pathlib import Path

model = Path('pet-model.js')
text = model.read_text(encoding='utf-8')

replacements = {
"    'castle-bg':": "    'castle-bg':'<g aria-hidden=\"true\"><rect width=\"240\" height=\"240\" rx=\"32\" fill=\"#dff1ff\"/><g opacity=\".96\"><path d=\"M0 181 H240 V240 H0Z\" fill=\"#b9dd8b\"/><path d=\"M0 189 Q46 168 87 184 T164 182 T240 184 V240 H0Z\" fill=\"#a8cf78\"/></g><g stroke=\"#8d8da5\" stroke-width=\"2.5\" stroke-linejoin=\"round\"><path d=\"M0 79 L31 61 L31 181 H0Z\" fill=\"#f3eee6\"/><path d=\"M209 61 L240 79 V181 H209Z\" fill=\"#f3eee6\"/><path d=\"M11 65 L31 28 L51 65Z\" fill=\"#7287c8\"/><path d=\"M189 65 L209 28 L229 65Z\" fill=\"#7287c8\"/><path d=\"M5 181 V132 H20 V116 H37 V132 H54 V181 M186 181 V132 H203 V116 H220 V132 H235 V181\" fill=\"#ece7e2\"/></g><g fill=\"#e56f7e\"><path d=\"M31 29 v-20 h4 v20Z\"/><path d=\"M209 29 v-20 h4 v20Z\"/><path d=\"M35 9 q21 6 31 16 q-17 8-31 2Z\"/><path d=\"M213 9 q-21 6-31 16 q17 8 31 2Z\"/></g><g fill=\"#fff\" opacity=\".9\"><circle cx=\"61\" cy=\"192\" r=\"4\"/><circle cx=\"179\" cy=\"195\" r=\"4\"/></g></g>',",
"    'sunset-bg':": "    'sunset-bg':'<g aria-hidden=\"true\"><rect width=\"240\" height=\"240\" rx=\"32\" fill=\"#f49b87\"/><rect width=\"240\" height=\"240\" rx=\"32\" fill=\"#8e73c2\" opacity=\".18\"/><circle cx=\"188\" cy=\"68\" r=\"31\" fill=\"#ffd86d\"/><g fill=\"#f8b37c\" opacity=\".85\"><path d=\"M24 70 Q50 52 76 70 Q62 76 24 70Z\"/><path d=\"M149 36 Q171 24 193 36 Q178 41 149 36Z\"/></g><path d=\"M0 122 Q44 92 88 122 T176 119 T240 116 V154 H0Z\" fill=\"#735b9f\" opacity=\".65\"/><path d=\"M0 151 Q53 136 101 151 T194 148 T240 147 V240 H0Z\" fill=\"#93bd69\"/><path d=\"M153 103 Q181 114 212 102\" stroke=\"#ffd879\" stroke-width=\"7\" stroke-linecap=\"round\" opacity=\".75\"/><g fill=\"#355c55\" opacity=\".78\"><path d=\"M0 143 Q17 128 35 143 V190 H0Z\"/><path d=\"M205 142 Q222 127 240 143 V191 H205Z\"/></g><g stroke=\"#725342\" stroke-width=\"6\" stroke-linecap=\"round\"><path d=\"M17 154 V205\"/><path d=\"M223 154 V205\"/></g></g>',",
"    'classroom-bg':": "    'classroom-bg':'<g aria-hidden=\"true\"><rect width=\"240\" height=\"240\" rx=\"32\" fill=\"#edf4e9\"/><rect x=\"28\" y=\"18\" width=\"184\" height=\"79\" rx=\"8\" fill=\"#e8c58e\"/><rect x=\"36\" y=\"25\" width=\"168\" height=\"64\" rx=\"5\" fill=\"#3e7566\"/><rect x=\"42\" y=\"103\" width=\"58\" height=\"45\" rx=\"4\" fill=\"#b9d9ef\" stroke=\"#7195b8\" stroke-width=\"4\"/><path d=\"M71 103 V148 M42 126 H100\" stroke=\"#7195b8\" stroke-width=\"3\"/><circle cx=\"193\" cy=\"119\" r=\"18\" fill=\"#fff8e8\" stroke=\"#75a2c7\" stroke-width=\"5\"/><path d=\"M193 119 L193 107 M193 119 L183 113\" stroke=\"#79614e\" stroke-width=\"3\" stroke-linecap=\"round\"/><g fill=\"#d9a66c\"><path d=\"M0 184 H50 V240 H0Z\"/><path d=\"M190 184 H240 V240 H190Z\"/><rect x=\"6\" y=\"165\" width=\"44\" height=\"18\" rx=\"4\"/><rect x=\"190\" y=\"165\" width=\"44\" height=\"18\" rx=\"4\"/></g><g fill=\"#6ba579\"><circle cx=\"18\" cy=\"154\" r=\"10\"/><circle cx=\"31\" cy=\"149\" r=\"12\"/><circle cx=\"210\" cy=\"153\" r=\"11\"/><circle cx=\"225\" cy=\"148\" r=\"12\"/></g><path d=\"M0 202 H240 V240 H0Z\" fill=\"#efd1a3\" opacity=\".78\"/></g>',",
"    'cafe-bg':": "    'cafe-bg':'<g aria-hidden=\"true\"><rect width=\"240\" height=\"240\" rx=\"32\" fill=\"#f8ead8\"/><path d=\"M0 0 H240 V35 H0Z\" fill=\"#e98588\"/><g fill=\"#fff2df\"><path d=\"M0 0 H30 L24 35 H0Z\"/><path d=\"M60 0 H90 L84 35 H54Z\"/><path d=\"M120 0 H150 L144 35 H114Z\"/><path d=\"M180 0 H210 L204 35 H174Z\"/></g><g stroke=\"#a77454\" stroke-width=\"4\" fill=\"#a9d9f2\"><path d=\"M23 60 H78 V121 H23Z\"/><path d=\"M162 60 H217 V121 H162Z\"/><path d=\"M50 60 V121 M23 90 H78 M189 60 V121 M162 90 H217\"/></g><g fill=\"#d6a36c\"><rect x=\"0\" y=\"143\" width=\"66\" height=\"35\" rx=\"6\"/><rect x=\"174\" y=\"143\" width=\"66\" height=\"35\" rx=\"6\"/></g><g fill=\"#fff6eb\" stroke=\"#b67c5d\" stroke-width=\"2\"><rect x=\"5\" y=\"126\" width=\"55\" height=\"27\" rx=\"8\"/><rect x=\"180\" y=\"126\" width=\"55\" height=\"27\" rx=\"8\"/></g><g fill=\"#6ca578\"><circle cx=\"27\" cy=\"117\" r=\"12\"/><circle cx=\"42\" cy=\"113\" r=\"11\"/><circle cx=\"198\" cy=\"116\" r=\"12\"/><circle cx=\"214\" cy=\"111\" r=\"11\"/></g><circle cx=\"24\" cy=\"44\" r=\"10\" fill=\"#ffd66f\"/><circle cx=\"216\" cy=\"44\" r=\"10\" fill=\"#ffd66f\"/><path d=\"M0 193 H240 V240 H0Z\" fill=\"#e8c89d\" opacity=\".7\"/></g>',",
"    'snow-bg':": "    'halloween-bg':'<g aria-hidden=\"true\"><rect width=\"240\" height=\"240\" rx=\"32\" fill=\"#6f5aa6\"/><rect width=\"240\" height=\"240\" rx=\"32\" fill=\"#f08c62\" opacity=\".18\"/><path d=\"M0 154 Q55 135 104 154 T198 151 T240 153 V240 H0Z\" fill=\"#88ad62\"/><circle cx=\"177\" cy=\"50\" r=\"28\" fill=\"#ffe09a\"/><circle cx=\"187\" cy=\"43\" r=\"28\" fill=\"#6f5aa6\"/><g fill=\"#352d58\"><path d=\"M19 71 l14-9 -5 12 15 4 -15 3 6 12 -15-10 -12 7 5-14 -12-7Z\"/><path d=\"M205 63 l12-7 -4 10 13 4 -13 3 5 10 -13-8 -10 6 4-12 -11-6Z\"/></g><g fill=\"#4f456f\" stroke=\"#302747\" stroke-width=\"2\"><path d=\"M0 153 V89 L18 67 L32 89 V153Z\"/><path d=\"M240 153 V89 L222 67 L208 89 V153Z\"/><path d=\"M11 80 L18 48 L25 80Z\"/><path d=\"M215 80 L222 48 L229 80Z\"/></g><g fill=\"#ffb147\"><path d=\"M4 205 Q10 178 28 182 Q47 184 49 205Z\"/><path d=\"M191 205 Q194 181 214 181 Q233 181 238 205Z\"/></g><g fill=\"#5b3b28\"><path d=\"M25 181 v-10 h6 v12Z\"/><path d=\"M212 181 v-10 h6 v12Z\"/></g><g fill=\"#ffd56c\"><circle cx=\"15\" cy=\"115\" r=\"4\"/><circle cx=\"225\" cy=\"114\" r=\"4\"/></g></g>',\n    'snow-bg':"
}

lines = text.splitlines()
out = []
for line in lines:
    replaced = False
    for prefix, new_line in replacements.items():
        if line.startswith(prefix):
            out.append(new_line)
            replaced = True
            break
    if not replaced:
        out.append(line)
text = '\n'.join(out) + ('\n' if text.endswith('\n') else '')

required = ['castle-bg','sunset-bg','classroom-bg','cafe-bg','halloween-bg','snow-bg']
for key in required:
    if key not in text:
        raise SystemExit(f'Missing background after patch: {key}')
model.write_text(text, encoding='utf-8')

shop = Path('pet-shop.js')
text = shop.read_text(encoding='utf-8')
needle = "  {id:'cafe-bg',name:'カフェの背景',price:25,slot:'backgrounds',icon:'☕'},\n  {id:'snow-bg',name:'雪の背景',price:25,slot:'backgrounds',icon:'❄️'}"
replacement = "  {id:'cafe-bg',name:'カフェの背景',price:25,slot:'backgrounds',icon:'☕'},\n  {id:'halloween-bg',name:'ハロウィンの背景',price:30,slot:'backgrounds',icon:'🎃'},\n  {id:'snow-bg',name:'雪の背景',price:25,slot:'backgrounds',icon:'❄️'}"
if needle not in text:
    raise SystemExit('Could not find background item insertion point')
text = text.replace(needle, replacement, 1)
shop.write_text(text, encoding='utf-8')
print('Refreshed castle/classroom/cafe/sunset backgrounds and added Halloween background.')
