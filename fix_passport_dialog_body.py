import re

file_path = 'src/components/clinical/PassportModal.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace inner content with DialogBody
old_start = r"""        \{/\* HEADER FIJO \*/\}"""
new_start = """      <DialogBody className="p-0">
        {/* HEADER FIJO */}"""
content = re.sub(old_start, new_start, content)

old_end = r"""          </div>
        </div>
      
    </Dialog>"""
new_end = """          </div>
        </div>
      </DialogBody>
    </Dialog>"""
content = re.sub(old_end, new_end, content)

with open('src/components/clinical/PassportModal.tsx', 'w') as f:
    f.write(content)

print("PassportModal DialogBody fixed.")
