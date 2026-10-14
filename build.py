from pathlib import Path
import base64
p=Path(__file__).resolve().parent
s=(p/'src/template.html').read_text(encoding='utf-8')
for n in ['wechat-contact','wechat-donate']:
 s=s.replace('{{'+n+'}}','data:image/png;base64,'+base64.b64encode((p/f'assets/{n}.png').read_bytes()).decode())
s=s.replace('{{THREE}}',(p/'vendor/three.min.js').read_text(encoding='utf-8')).replace('{{APP}}',(p/'src/lesson.js').read_text(encoding='utf-8'))
(p/'index.html').write_text(s,encoding='utf-8')
print('Built offline index.html')
