import re

file_path = 'src/components/clinical/PassportModal.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';", "import { Dialog, DialogBody, DialogTitle, DialogDescription } from '@/components/ui/dialog';")

# 2. JSX Replacements
content = content.replace("<Dialog open={isOpen} onOpenChange={onClose}>", '<Dialog open={isOpen} onOpenChange={onClose} maxWidth="max-w-4xl">')

old_dialog_content = r"""      <DialogContent className="max-w-4xl max-h-\[90vh\] overflow-y-auto p-0 rounded-2xl gap-0 border-0">"""
new_dialog_content = ""
content = re.sub(old_dialog_content, new_dialog_content, content)

content = content.replace("</DialogContent>", "")

with open('src/components/clinical/PassportModal.tsx', 'w') as f:
    f.write(content)

print("PassportModal fixed.")
