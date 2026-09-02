import re

files_to_check = [
    'src/app/pacientes/page.tsx',
    'src/app/agenda/page.tsx',
    'src/app/finanzas/page.tsx',
    'src/app/planes/page.tsx'
]

for file in files_to_check:
    with open(file, 'r') as f:
        content = f.read()

    # Title replacements
    # It might be `text-2xl font-bold` or something. Let's find h1 or h2 that acts as title.
    # Typical: <h1 className="text-2xl font-bold text-slate-900">
    # Let's replace any `text-2xl font-bold.*?text-slate-900` with the standard class.
    content = re.sub(r'className="[^"]*text-2xl font-bold[^"]*"', 'className="text-2xl font-bold text-slate-900 tracking-tight"', content)
    
    # Border replacements for cards (bg-white border)
    # Replaces `border-slate-200` with `border-slate-200/80` globally where it appears in class names, except if it already has /80
    # Let's do it carefully.
    content = re.sub(r'border-slate-200(?![/\d])', 'border-slate-200/80', content)

    # Main wrapper background
    content = re.sub(r'bg-slate-50\b(?!/)', 'bg-slate-50/50', content)

    with open(file, 'w') as f:
        f.write(content)
