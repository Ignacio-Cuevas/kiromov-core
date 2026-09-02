import re
import os

files_to_check = []
for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            files_to_check.append(os.path.join(root, file))

for file in files_to_check:
    with open(file, 'r') as f:
        content = f.read()

    original = content

    # Standardize backdrop wrapper
    content = re.sub(
        r'className="fixed inset-0[^"]*flex items-center justify-center[^"]*bg-slate-900/60[^"]*"',
        'className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden"',
        content
    )

    # Standardize modal wrapper
    content = re.sub(
        r'className="relative w-full max-w-(xl|2xl|lg) max-h-\[90vh\] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden(?! animate-in)[^"]*"',
        r'className="relative w-full max-w-\1 max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"',
        content
    )

    # Standardize Header Fijo
    content = re.sub(
        r'className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10"',
        'className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10"',
        content
    )

    # Standardize Footer Fijo
    content = re.sub(
        r'className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 sticky bottom-0 z-10"',
        'className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80 sticky bottom-0 z-10"',
        content
    )

    if content != original:
        with open(file, 'w') as f:
            f.write(content)
        print(f"Updated {file}")

