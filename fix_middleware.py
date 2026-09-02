import re

file_path = 'src/utils/supabase/middleware.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Fail-close on missing env vars instead of bypassing
missing_vars = r'if \(!supabaseUrl \|\| !supabaseKey \|\| supabaseUrl.includes\("tu_supabase_url"\)\) \{\n.*?return supabaseResponse;\n\s*\}'
new_missing_vars = """if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("tu_supabase_url")) {
      if (!isPublicRoute) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.searchParams.set('error', 'session_error');
        return NextResponse.redirect(loginUrl);
      }
      return supabaseResponse;
    }"""
content = re.sub(missing_vars, new_missing_vars, content, flags=re.DOTALL)

# Redirect to login instead of just throwing null on auth error
# The original code has:
#   } catch {
#     return NextResponse.next({
#       request: {
#         headers: request.headers,
#       },
#     });
#   }
# At the very end of updateSession.

catch_block = r'\} catch \{\n\s*return NextResponse\.next\(\{\n\s*request: \{\n\s*headers: request\.headers,\n\s*\},\n\s*\}\);\n\s*\}'
new_catch_block = """} catch {
    if (!isPublicRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set('error', 'session_error');
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request: { headers: request.headers } });
  }"""
content = re.sub(catch_block, new_catch_block, content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)

# Now fix src/middleware.ts
mid_path = 'src/middleware.ts'
with open(mid_path, 'r') as f:
    mid_content = f.read()

mid_catch = r'\} catch \{\n\s*return NextResponse\.next\(\);\n\s*\}'
new_mid_catch = """} catch {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set('error', 'session_error');
    return NextResponse.redirect(loginUrl);
  }"""
mid_content = re.sub(mid_catch, new_mid_catch, mid_content, flags=re.DOTALL)

with open(mid_path, 'w') as f:
    f.write(mid_content)

print("Middleware fortified.")
