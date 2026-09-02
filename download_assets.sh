#!/bin/bash
source .env.local

mkdir -p public/branding

# Descargar logo oficial
curl -s -L "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/public/branding/public%3Alogo.png" -o public/branding/logo.png || \
curl -s -L "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/public/branding/logo.png" -o public/branding/logo.png

# Descargar timbre oficial
curl -s -L "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/public/branding/public%3Atimbre.png" -o public/branding/timbre.png || \
curl -s -L "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/public/branding/timbre.png" -o public/branding/timbre.png

ls -l public/branding/
