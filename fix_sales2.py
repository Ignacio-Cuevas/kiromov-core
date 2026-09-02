import re

file_path = 'src/actions/sales.ts'
with open(file_path, 'r') as f:
    content = f.read()

old_insert = r"const \{ data: newSale \} = await supabase\s*\.from\('sales'\)\s*\.insert\(.*?\)\s*\.select\(\)\s*\.single\(\);"

new_insert = """const { data: newSale, error: saleError } = await supabase
          .from('sales')
          .insert([
            {
              patient_id: data.patient_id,
              plan_id: data.plan_id || null,
              concept: conceptName,
              sessions_quantity: sessionsQty,
              total_amount_clp: totalAmount,
              payment_method: data.payment_method || 'transfer',
              payment_status: data.payment_status || 'paid',
              receipt_number: boletaClean,
              notes: data.notes?.trim() || null,
            },
          ])
          .select()
          .single();
          
        if (saleError) {
          console.error('Error insertando sale:', saleError);
          throw new Error(saleError.message);
        }"""

content = re.sub(old_insert, new_insert, content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)

print("Sales fixed 2.")
