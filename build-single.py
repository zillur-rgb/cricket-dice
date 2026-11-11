# Bundles public/ into one self-contained HTML page (for hosting as a single file)
import re, sys, pathlib
root = pathlib.Path(__file__).parent / 'public'
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'cricket-dice.html')
html = (root / 'index.html').read_text()
body = re.search(r'<body>(.*?)<script src="engine.js">', html, re.S).group(1)
page = f'''<title>Cricket Dice</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
{(root / 'style.css').read_text()}
</style>
{body.strip()}
<script>
{(root / 'engine.js').read_text()}
</script>
<script>
{(root / 'competition.js').read_text()}
</script>
<script>
{(root / 'app.js').read_text()}
</script>
'''
out.write_text(page)
print(out, len(page), 'bytes')
