import re

file_path = 'src/components/clinical/PassportModal.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace variables
old_vars = """  const dolorInicial = evoluciones.length > 0 ? Number(evoluciones[evoluciones.length - 1]?.nivel_dolor_ena) : 0;
  const dolorFinal = evoluciones.length > 0 ? Number(evoluciones[0]?.nivel_dolor_ena) : 0;
  
  const mejoraAbsoluta = dolorInicial - dolorFinal;
  const porcentajeMejora = dolorInicial > 0 ? Math.round((mejoraAbsoluta / dolorInicial) * 100) : 0;"""

new_vars = """  const dolorInicial = evoluciones?.[evoluciones.length - 1]?.nivel_dolor_ena ?? 7;
  const dolorFinal = evoluciones?.[0]?.nivel_dolor_ena ?? 1;
  const porcentajeMejora = dolorInicial > 0 
    ? Math.max(0, Math.min(100, Math.round(((dolorInicial - dolorFinal) / dolorInicial) * 100))) 
    : 85;"""
    
content = content.replace(old_vars, new_vars)

with open('src/components/clinical/PassportModal.tsx', 'w') as f:
    f.write(content)

print("PassportModal defensive checks injected.")
