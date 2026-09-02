import re

def inject_import(filepath, imp):
    with open(filepath, 'r') as f:
        c = f.read()
    if imp not in c:
        c = re.sub(r"(import React.*?from 'react';)", r"\1\n" + imp, c)
        with open(filepath, 'w') as f:
            f.write(c)

inject_import('src/app/pacientes/page.tsx', 'import SaleModal from "@/components/sales/SaleModal";')
inject_import('src/app/finanzas/page.tsx', 'import { SettlePaymentModal } from "@/components/sales/SettlePaymentModal";')
inject_import('src/app/agenda/page.tsx', 'import SaleModal from "@/components/sales/SaleModal";\nimport { SettlePaymentModal } from "@/components/sales/SettlePaymentModal";')

print("Imports injected.")
