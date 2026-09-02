import re

with open('src/components/patients/PatientDrawer.tsx', 'r') as f:
    content = f.read()

# Make TabsList sticky and pill-style
content = content.replace(
    'className="grid w-full grid-cols-3 bg-slate-200/70 p-1 rounded-xl"',
    'className="grid w-full grid-cols-3 bg-slate-200/80 p-1 rounded-xl sticky top-0 z-20 backdrop-blur-md shadow-sm"'
)

with open('src/components/patients/PatientDrawer.tsx', 'w') as f:
    f.write(content)
