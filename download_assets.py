import urllib.request
import os

# Create directory
os.makedirs('public/branding', exist_ok=True)

# Supabase details
project_id = 'nxlabwiewewwkwemtvfj' # Extracted from the Header.tsx url
base_url = f"https://{project_id}.supabase.co/storage/v1/object/public/branding"

try:
    urllib.request.urlretrieve(f"{base_url}/logo.png", "public/branding/logo.png")
    print("Downloaded logo.png")
except Exception as e:
    print("Failed to download logo.png:", e)
    # try public:logo.png?
    try:
        urllib.request.urlretrieve(f"{base_url}/public:logo.png", "public/branding/logo.png")
        print("Downloaded public:logo.png")
    except Exception as e2:
        print("Failed to download public:logo.png:", e2)


try:
    urllib.request.urlretrieve(f"{base_url}/timbre.png", "public/branding/timbre.png")
    print("Downloaded timbre.png")
except Exception as e:
    print("Failed to download timbre.png:", e)

