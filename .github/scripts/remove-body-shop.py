from pathlib import Path
import re

shop = Path('pet-shop.js')
text = shop.read_text(encoding='utf-8')

body_ids = ['white-shirt','star-shirt','hoodie','cape','overalls']
for item_id in body_ids:
    text, n = re.subn(r"^\s*\{id:'" + re.escape(item_id) + r"'.*?\},\n", '', text, flags=re.M)
    if n != 1:
        raise SystemExit(f'Expected one shop item for {item_id}, got {n}')

text, n = re.subn(r"^\s*\{id:'body',label:'からだ',icon:'👕'\},\n", '', text, flags=re.M)
if n != 1:
    raise SystemExit(f'Expected body tab once, got {n}')
shop.write_text(text, encoding='utf-8')

model = Path('pet-model.js')
text = model.read_text(encoding='utf-8')
for item_id in body_ids:
    text, n = re.subn(
        r"^\s*'" + re.escape(item_id) + r"':'<g.*?\n",
        '', text, flags=re.M
    )
    if n != 1:
        raise SystemExit(f'Expected one SVG accessory for {item_id}, got {n}')

mapping = "  'white-shirt':'body','star-shirt':'body','hoodie':'body','cape':'body','overalls':'body'\n"
if text.count(mapping) != 1:
    raise SystemExit(f'Expected body slot mapping block once, got {text.count(mapping)}')
text = text.replace(mapping, '')

old = "for(const slot of ['head','face','neck','body'])"
new = "for(const slot of ['head','face','neck'])"
if text.count(old) != 1:
    raise SystemExit(f'Expected accessory slot loop once, got {text.count(old)}')
text = text.replace(old, new)
model.write_text(text, encoding='utf-8')

print('Removed body shop tab, items, art, mappings, and rendering slot.')
