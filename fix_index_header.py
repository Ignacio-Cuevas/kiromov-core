import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Remove <header> block entirely
content = re.sub(r'<header.*?</header>', '', content, flags=re.DOTALL)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
