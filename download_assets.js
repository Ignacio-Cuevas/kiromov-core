const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function download() {
  const { data: logoData, error: logoErr } = await supabase.storage.from('branding').download('logo.png');
  if (logoData) {
    const buffer = Buffer.from(await logoData.arrayBuffer());
    fs.writeFileSync('public/branding/logo.png', buffer);
    console.log('logo.png downloaded');
  } else {
    console.error('Error logo:', logoErr);
  }

  const { data: timbreData, error: timbreErr } = await supabase.storage.from('branding').download('timbre.png');
  if (timbreData) {
    const buffer = Buffer.from(await timbreData.arrayBuffer());
    fs.writeFileSync('public/branding/timbre.png', buffer);
    console.log('timbre.png downloaded');
  } else {
    console.error('Error timbre:', timbreErr);
  }
}

download();
