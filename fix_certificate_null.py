import re

with open('src/components/clinical/ReimbursementCertificate.tsx', 'r') as f:
    content = f.read()

replacement = """    const fetchData = async () => {
      if (!supabase) return;
      setLoading(true);"""

content = content.replace("    const fetchData = async () => {\n      setLoading(true);", replacement)

with open('src/components/clinical/ReimbursementCertificate.tsx', 'w') as f:
    f.write(content)
