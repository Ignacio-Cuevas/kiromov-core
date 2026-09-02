import re

file_path = 'src/actions/sales.ts'
with open(file_path, 'r') as f:
    content = f.read()

old_insert = r"await supabase\.from\('patient_plans'\)\.insert\(\[\s*\{.*?\}\s*(?:,|)\s*\]\);"

new_insert = """const { error: ppError } = await supabase.from('patient_plans').insert([
            {
              patient_id: data.patient_id,
              sale_id: newSale.id,
              plan_name: conceptName,
              total_sessions: sessionsQty,
              used_sessions: 0,
              receipt_number: boletaClean,
              status: 'active',
            },
          ]);
          if (ppError) {
            console.error('Error insertando patient_plans:', ppError);
            throw new Error(ppError.message);
          }"""

content = re.sub(old_insert, new_insert, content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)

print("Sales fixed.")
