import re

file_path = 'src/app/api/webhooks/calendar/route.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Insert validation code inside the POST function
auth_block = """  const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization');
  const secretKey = process.env.CALENDAR_WEBHOOK_SECRET;

  if (!secretKey || authHeader !== secretKey) {
    return NextResponse.json({ error: 'No autorizado: Token de webhook inválido o ausente' }, { status: 401 });
  }

  try {"""

content = re.sub(r'export async function POST\(req: NextRequest\) \{\n  try \{', 'export async function POST(req: NextRequest) {\n' + auth_block, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Webhook fortified.")
