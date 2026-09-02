import os
import re

files_to_check = [
    'src/app/pacientes/page.tsx',
    'src/app/agenda/page.tsx',
    'src/app/finanzas/page.tsx',
    'src/app/planes/page.tsx'
]

for file in files_to_check:
    if not os.path.exists(file):
        print(f"File not found: {file}")
        continue
    with open(file, 'r') as f:
        content = f.read()

    # The headers start with <header and end with </header>
    # Since there might be multiple (unlikely in the root page structure but just in case),
    # let's find the main header. They are usually right after <div className="...min-h-screen...">
    
    new_content = re.sub(r'<header.*?</header>', '', content, count=1, flags=re.DOTALL)
    
    with open(file, 'w') as f:
        f.write(new_content)
    print(f"Stripped header from {file}")
