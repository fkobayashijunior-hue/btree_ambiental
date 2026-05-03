# Hostinger DB Findings (from screenshots 03/05/2026)

## Collaborators table
- Has columns: id, user_id, name, email, phone, cpf, rg, address, city, state, zip_code, photo_url, face_descriptor, role, pix_key, daily_rate, employment_type, shirt_size, pants_size, shoe_size, boot_size, active, created_at, updated_at, created_by, sector_id, client_id
- **client_id column EXISTS** (last column, all NULL currently)
- **active column** = 1 (integer, not boolean)
- **user_id column** = ALL NULL for all collaborators shown
- Juliano Moro Fernandes = id 12, user_id NULL, role "encarregado", email jmoro1980@gmail.com
- Todos os colaboradores têm user_id = NULL (nenhum vinculado a um user OAuth)

## Key issue: user_id is NULL for ALL collaborators
- When Juliano logs in via OAuth, a record is created in `users` table
- But the `collaborators.user_id` is NOT being set to link them
- So the query that checks `collaborators.userId === user.id` never finds a match
- This means: listUsers returns users from `users` table but collaborators have no link

## Database connection
- Server: 127.0.0.1:3306 (internal Hostinger, not accessible externally)
- Database: u629128033_btree_ambienta
- phpMyAdmin: auth-db572.hstgr.io
