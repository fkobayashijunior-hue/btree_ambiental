# Hostinger Issue Analysis

The screenshot shows the OLD simplified form (Nome, Tipo Combustível, Preço/L, Local/Endereço, Observações).
The NEW form (with CNPJ, razão social, telefone, email, etc.) was committed to GitHub but the Hostinger deploy hasn't picked it up.

The user needs to:
1. Trigger a new build on Hostinger (pull from GitHub + rebuild)
2. The SQL error (#1060 - duplicate column 'trade_name') means the auto-migration already ran partially on the DB

The code in our repo is correct - the FuelSuppliersPage.tsx has the complete form.
The issue is purely a deployment/cache issue on Hostinger.

For the SQL: since some columns already exist, we need to provide individual ALTER TABLE statements wrapped in a procedure or just tell the user to skip errors.
