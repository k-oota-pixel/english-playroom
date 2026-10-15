from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
old = '<title>英語学習｜おおたまごっち</title>\n<link rel="stylesheet" href="./pet.css">'
new = '<title>おおたまごっち</title>\n<link rel="icon" href="./favicon.svg" type="image/svg+xml">\n<link rel="stylesheet" href="./pet.css">'
if old not in text:
    raise SystemExit('Expected title block not found')
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('Updated browser tab title and favicon link.')
