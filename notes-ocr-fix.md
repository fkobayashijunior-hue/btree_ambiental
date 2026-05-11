# OCR Fix Analysis

## Problem
1. Error "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY" on Hostinger
2. Need to support TWO images (NF + boleto)

## Root Cause
The extractInvoiceFromPhoto procedure uses storagePut from S3 which requires BUILT_IN_FORGE_API_URL/KEY.
On Hostinger these env vars don't exist.

## Solution
1. Instead of uploading to S3 first, send the base64 directly to LLM vision (no S3 needed for OCR)
2. For saving the photo URL, use Cloudinary (already configured in the project for other uploads)
3. Add support for 2 images: NF photo + boleto photo
4. Add boletoPhotoUrl to form state and payload

## Changes needed:
### Backend (server/routers/fuelSuppliers.ts):
- extractInvoiceFromPhoto: Don't upload to S3, just send base64 to LLM directly
- Accept multiple images (array of base64)
- Return extracted data without photoUrl (photo saved separately via Cloudinary)

### Frontend (FuelInvoicesPage.tsx):
- Add boletoPhotoUrl to emptyForm
- Add second photo upload (NF photo + Boleto photo)
- Upload photos via existing Cloudinary upload endpoint
- Show both photos in preview and details modal
