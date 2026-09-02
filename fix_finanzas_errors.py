import re

file_path = 'src/app/finanzas/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Fix export
content = content.replace("export function FinanzasContent() {", "function FinanzasContent() {")

# Fix sonner
content = content.replace('import toast from "react-hot-toast";', 'import { toast } from "sonner";')

# Fix CheckCircle2
content = content.replace('import { Loader2, Plus, CreditCard, TrendingUp, TrendingDown, DollarSign } from "lucide-react";', 'import { Loader2, Plus, CreditCard, TrendingUp, TrendingDown, DollarSign, CheckCircle2 } from "lucide-react";')

with open(file_path, 'w') as f:
    f.write(content)

print("Finanzas page errors fixed.")
