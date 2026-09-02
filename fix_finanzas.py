import re

file_path = 'src/app/finanzas/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace `await supabase.from('egresos_caja').insert([nuevoEgreso]);`
# with:
# const { error } = await supabase.from('egresos_caja').insert([nuevoEgreso]);
# if (error) throw new Error(error.message);

old_insert = r"await supabase\.from\('egresos_caja'\)\.insert\(\[nuevoEgreso\]\);"
new_insert = """const { error } = await supabase.from('egresos_caja').insert([nuevoEgreso]);
      if (error) {
        console.error('Error en Supabase:', error);
        throw new Error(error.message);
      }"""
content = re.sub(old_insert, new_insert, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Finanzas fixed.")
