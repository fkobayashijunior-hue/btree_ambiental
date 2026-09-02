# Mapeamento completo: Reestruturação Notas/Ações

## Estrutura atual

### Backend
- `server/routers/cargoLoads.ts` (linha 531): create com input schema
  - Campos: date, vehicleId, vehiclePlate, driverCollaboratorId, driverName, heightM, widthM, lengthM, volumeM3, weightKg, weightOutKg, weightInKg, weightNetKg, woodType, destination, destinationId, invoiceNumber, clientId, clientName, photosJson, notes, status, workLocationId, humidity, deliveryDate, receiverName, thirdPartyContractor, thirdPartyCost, fiscalNoteId
  - Linha 665: marca nota como usada (se fiscalNoteId fornecido)
  - Linha 880: uploadDocument (invoice, boleto, payment_receipt)

- `server/routers/fiscalNotes.ts` (244 linhas):
  - getNextActionCode (linha 8): gera AC-XXXXX sequencial
  - list (linha 20): lista com filtros quantityType, status
  - getAvailable (linha 40): lista apenas disponíveis
  - create (linha 55): cria nota/ação com upload de arquivo
  - markAsUsed (linha 115): marca como usada
  - update (linha 140): edita nota
  - release (linha 175): libera nota
  - delete (linha 190): deleta nota
  - stats (linha 200): estatísticas

- `server/routers/invoiceControl.ts`:
  - list (linha 10): lista cargas com joins (cargoDestinations, clients)
  - toggleChecked (linha 82): marca nota como conferida
  - stats (linha 95): estatísticas de conferência

### Schema (drizzle/schema.ts)
- `cargoLoads` (linha 66): id, date, vehicleId, vehiclePlate, driverCollaboratorId, driverName, heightM, widthM, lengthM, volumeM3, woodType, destination, invoiceNumber, clientId, clientName, photosJson, notes, status, registeredBy, createdAt, updatedAt, weightKg, destinationId, trackingStatus, trackingUpdatedAt, trackingNotes, weightOutPhotoUrl, weightInPhotoUrl, weightOutKg, weightInKg, finalHeightM, finalWidthM, finalLengthM, finalVolumeM3, workLocationId, weightNetKg, invoiceUrl, boletoUrl, boletoAmount, boletoDueDate, paymentReceiptUrl, paymentStatus, paidAt, humidity, deliveryDate, receivedByBuyer, receivedAt, receiverName, thirdPartyContractor, thirdPartyCost, thirdPartyPaid, thirdPartyPaidAt, thirdPartyPaymentNotes, invoiceChecked, invoiceCheckedAt, invoiceCheckedBy, invoiceCheckedByName, fiscalNoteId

- `fiscalNotes` (linha 1592): id, actionCode, invoiceNumber, issueDate, quantityType (m3/ton), quantity, fileUrl, status (available/used), usedByCargoId, usedByClientId, usedByClientName, usedAt, notes, createdBy, createdAt, updatedAt

- `gpsLocations` (linha 562): id, name, latitude, longitude, radiusMeters, isActive, clientId, notes, createdBy, createdByName, createdAt, updatedAt

### Frontend
- `client/src/pages/CargoControl.tsx`:
  - Linha 25: import WorkLocationSelect
  - Linha 27: import useWorkLocations
  - Linha 1259: const { locations: workLocations } = useWorkLocations()
  - Linha 1306: form com invoiceNumber
  - Linha 1369: const { data: availableNotes = [] } = trpc.fiscalNotes.getAvailable.useQuery()
  - Linha 1374: const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null)
  - Linha 1535: handleSubmit (marca nota como usada via fiscalNoteId)
  - Linha 1600: handleDocUpload (upload de invoice, boleto, payment_receipt)
  - Linha 2632: campo "Ação / Nota Fiscal" (select de availableNotes + input manual)

- `client/src/pages/FiscalNotesPage.tsx` (rota /controle-notas):
  - Linha 56: NoteCard (exibição atual em cards)
  - Linha 118: emptyForm, FiscalNotesPage component
  - Linha 131: const [search, setSearch] = useState("")
  - Linha 254: filtered (filtro por search)
  - Linha 265: m3Notes, tonNotes (separação por tipo)
  - Linha 638: Tabs (Todas, Metro Cúbico, Toneladas)
  - Linha 672: listagem com NoteCard (Disponíveis / Utilizadas)

- `client/src/pages/InvoiceControlPage.tsx` (rota /conferencia-notas):
  - Listagem de notas de cargas entregues com status de conferência
  - Filtros: search, filterChecked, filterDestination, dateFrom, dateTo

- `client/src/hooks/useWorkLocations.ts`:
  - Hook que retorna locations filtradas por permissões

## Implementação necessária

### 1. Backend: cargoLoads.create
- Adicionar campos ao input schema: invoiceFileBase64, invoiceFileName, invoiceFileMimeType
- Após inserir carga, gerar ação automaticamente:
  - Chamar getNextActionCode
  - Criar fiscal_note com: actionCode, invoiceNumber (da carga), issueDate (data da carga), quantityType (m3 se volumeM3 > 0, senão ton), quantity (volumeM3 ou weightNetKg), fileUrl (upload do PDF se fornecido), status "used", usedByCargoId (id da carga), usedByClientId, usedByClientName, usedAt (data atual), notes (workLocation → destination)
- Upload do PDF da NF para Cloudinary (se fornecido)

### 2. Frontend: CargoControl.tsx
- Remover seleção manual de ação (availableNotes, selectedNoteId)
- Adicionar prévia da próxima ação (ex: "AC-00045") — chamar fiscalNotes.getNextActionCode
- Adicionar campo upload NF em PDF (opcional) — input file + preview
- handleSubmit: passar invoiceNumber + invoiceFileBase64 para o create

### 3. Frontend: FiscalNotesPage.tsx (Controle de Notas)
- Transformar em relatório-planilha:
  - Tabela com colunas: Data, Ação, NF, Local, Destino, Qtd Nota, Qtd Real, Diferença
  - Filtros: local (workLocation), data início/fim
  - Resumo: totais de qtd nota vs real por tipo (m³/ton)
  - Manter ações: editar, liberar, excluir, ver arquivo
- Usar invoiceControl.list como base (já tem joins com cargoDestinations e clients)
- Adicionar join com fiscal_notes para pegar actionCode, quantityType, quantity
- Adicionar join com gpsLocations para pegar nome do local

## Próximos passos
1. Implementar backend (cargoLoads.create)
2. Implementar frontend (CargoControl.tsx)
3. Implementar frontend (FiscalNotesPage.tsx)
4. Compilar e fazer deploy
