import re

with open('src/app/layout.tsx', 'r') as f:
    content = f.read()

# Replace the body className
content = re.sub(
    r'<body className="[^"]*">',
    '<body className="bg-slate-50/50 text-slate-900 antialiased flex flex-col min-h-full">',
    content
)

with open('src/app/layout.tsx', 'w') as f:
    f.write(content)
