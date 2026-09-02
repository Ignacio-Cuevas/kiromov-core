import re

# 1. Fix SettlePaymentModal imports and supabase
with open('src/components/sales/SettlePaymentModal.tsx', 'r') as f:
    c = f.read()
c = c.replace("import { toast } from 'react-hot-toast';", "import { toast } from 'sonner';")
c = c.replace("const handleSubmit = async (e: React.FormEvent) => {", "const handleSubmit = async (e: React.FormEvent) => {\n    if (!supabase) return;\n")
with open('src/components/sales/SettlePaymentModal.tsx', 'w') as f:
    f.write(c)


# 2. Fix src/app/pacientes/page.tsx imports
with open('src/app/pacientes/page.tsx', 'r') as f:
    c = f.read()
if 'import { SaleModal }' not in c:
    c = c.replace('import { PatientDrawer } from "@/components/patients/PatientDrawer";', 'import { PatientDrawer } from "@/components/patients/PatientDrawer";\nimport SaleModal from "@/components/sales/SaleModal";')
if 'const [isSaleModalOpen' not in c:
    c = c.replace('const [pacientes, setPacientes] = useState<any[]>([]);', 'const [pacientes, setPacientes] = useState<any[]>([]);\n  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);')
with open('src/app/pacientes/page.tsx', 'w') as f:
    f.write(c)


# 3. Fix src/app/finanzas/page.tsx imports
with open('src/app/finanzas/page.tsx', 'r') as f:
    c = f.read()
if 'import { SettlePaymentModal }' not in c:
    c = c.replace('import { Suspense, useEffect, useState } from "react";', 'import { Suspense, useEffect, useState } from "react";\nimport { SettlePaymentModal } from "@/components/sales/SettlePaymentModal";')
with open('src/app/finanzas/page.tsx', 'w') as f:
    f.write(c)


# 4. Fix src/app/agenda/page.tsx imports and states
with open('src/app/agenda/page.tsx', 'r') as f:
    c = f.read()
if 'import { SaleModal }' not in c:
    c = c.replace('import { createClient } from "@/utils/supabase/client";', 'import { createClient } from "@/utils/supabase/client";\nimport SaleModal from "@/components/sales/SaleModal";\nimport { SettlePaymentModal } from "@/components/sales/SettlePaymentModal";')
if 'const [showNoSessionsAlert' not in c:
    c = c.replace('const [citas, setCitas] = useState<any[]>([]);', 'const [citas, setCitas] = useState<any[]>([]);\n  const [showNoSessionsAlert, setShowNoSessionsAlert] = useState<any>(null);\n  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);\n  const [settlingPlan, setSettlingPlan] = useState<any>(null);')
with open('src/app/agenda/page.tsx', 'w') as f:
    f.write(c)

print("Fixed imports and states")
