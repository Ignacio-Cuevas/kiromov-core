import re
import os

files_to_check = [
    'src/app/planes/page.tsx',
    'src/app/finanzas/page.tsx',
    'src/app/agenda/page.tsx'
]

for file in files_to_check:
    with open(file, 'r') as f:
        content = f.read()

    # Remove the import
    content = re.sub(r'import\s+{\s*Header\s*}\s+from\s+[\'"]@/components/dashboard/Header[\'"];?\n', '', content)

    # Remove the <Header ... /> tag
    # Using DOTALL so it matches across newlines for multi-line props
    content = re.sub(r'<Header[^>]*/>', '', content, flags=re.DOTALL)

    with open(file, 'w') as f:
        f.write(content)
    print(f"Cleaned {file}")

# Delete the ghost header file
ghost_header = 'src/components/dashboard/Header.tsx'
if os.path.exists(ghost_header):
    os.remove(ghost_header)
    print(f"Deleted {ghost_header}")

