with open('src/app/layout.tsx', 'r') as f:
    content = f.read()

import_statement = 'import { Header } from "@/components/layout/Header";\n'
if 'import { Header }' not in content:
    content = import_statement + content

content = content.replace('{children}', '<Header />\n        {children}')

with open('src/app/layout.tsx', 'w') as f:
    f.write(content)
