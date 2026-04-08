# .env Update Guide - Project Handover Migration

## ⚠️ CRITICAL: Update Required Before Use

Your Project Handover application has been migrated to Bolt-managed Supabase. The `.env` file still contains old credentials and must be updated.

---

## Quick Update Steps

### 1. Backup Current .env
```bash
cp .env .env.backup
```

### 2. Get Bolt-Managed Credentials

**Option A: From Bolt Dashboard**
1. Open your Bolt Dashboard
2. Go to Project Settings
3. Navigate to Supabase section
4. Copy the following:
   - Supabase URL
   - Anon Key (Public Key)

**Option B: From Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your Bolt-managed Project Handover project
3. Click Settings → API
4. Copy:
   - Project URL
   - anon/public key (NOT service_role key)

### 3. Update .env File

Open `.env` and replace with your Bolt-managed credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key-here
```

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
```

### 4. Save and Restart

```bash
# Save the .env file
# Then restart your development server
npm run dev
```

### 5. Clear Browser Cache

After restarting, clear your browser's cache and localStorage:
- Chrome: DevTools → Application → Clear site data
- Firefox: DevTools → Storage → Clear All
- Or simply use Incognito/Private mode

### 6. Test Login

1. Go to http://localhost:5173
2. Try logging in with existing credentials
3. If successful, migration is complete!

---

## Current vs New Configuration

### ❌ OLD (Personal Supabase - DO NOT USE)
```env
VITE_SUPABASE_URL=https://izufnkvcdbshjuwuxhhr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6dWZua3ZjZGJzaGp1d3V4aGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NzIxMzQsImV4cCI6MjA3MzA0ODEzNH0.ca3Rch3Fv2JXRswFFbvtVI_ii7qFJvcp7cQmgcwMCYw
```

### ✅ NEW (Bolt-Managed - GET FROM DASHBOARD)
```env
VITE_SUPABASE_URL=<your-bolt-managed-url>
VITE_SUPABASE_ANON_KEY=<your-bolt-managed-anon-key>
```

---

## Troubleshooting

### Problem: "Missing Supabase environment variables"
**Solution:** Make sure you saved the `.env` file and restarted the dev server

### Problem: "Failed to connect to Supabase"
**Solution:**
1. Verify the URL is correct (should end with `.supabase.co`)
2. Verify the anon key is complete (starts with `eyJ`)
3. Check for extra spaces or quotes

### Problem: "Cannot read properties of null"
**Solution:** Clear browser cache and localStorage, then refresh

### Problem: "User not found" or "Invalid credentials"
**Solution:** This is normal - the data is migrated and your account exists. Just log in with your existing credentials.

### Problem: Files/attachments not loading
**Solution:** Storage bucket may need configuration. See `MIGRATION_STATUS.md` for storage setup instructions.

---

## Verification Checklist

After updating .env, verify these work:

- [ ] Application loads without errors
- [ ] Can log in with existing credentials
- [ ] Can see project dashboard
- [ ] Can view project details
- [ ] Can create new project
- [ ] Can edit existing project
- [ ] Can upload files
- [ ] Can view stages

---

## Need Help?

1. Check `MIGRATION_FINAL_REPORT.md` for complete migration details
2. Check `MIGRATION_STATUS.md` for troubleshooting
3. Verify Supabase service status at https://status.supabase.com

---

## Rollback Instructions

If something goes wrong, you can rollback:

```bash
# Restore old .env
cp .env.backup .env

# Restart dev server
npm run dev
```

The old personal Supabase project is untouched and still has all your data.

---

**Remember:** The migration is complete and all your data is safely in the new Bolt-managed Supabase. You just need to update the connection credentials in `.env`.
