import re

with open('src/components/ui/sheet.tsx', 'r') as f:
    content = f.read()

content = content.replace('bg-slate-900/40 backdrop-blur-xs', 'bg-slate-900/40 backdrop-blur-sm')
content = content.replace('transition-transform duration-300 ease-out animate-in slide-in-from-right sm:border-l border-slate-200', 'transition-transform duration-300 ease-in-out animate-in slide-in-from-right sm:border-l border-slate-200')

with open('src/components/ui/sheet.tsx', 'w') as f:
    f.write(content)
