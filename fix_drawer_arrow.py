import re

file_path = 'src/components/patients/PatientDrawer.tsx'
with open(file_path, 'r') as f:
    content = f.read()

content = content.replace("c: any =>", "(c: any) =>")

with open('src/components/patients/PatientDrawer.tsx', 'w') as f:
    f.write(content)

print("Fixed arrow function syntax in PatientDrawer.")
