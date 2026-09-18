import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { clientAreas, clients, cargoLoads, gpsLocations, userPermissions } from '../../drizzle/schema';
import { requireConfirmedArea } from '../lib/clientAreaScope';

const name = z.string().trim().min(1).max(255);
const optionalText = z.string().trim().max(255).optional();
function locationName(client: string, area: { name: string; fieldName?: string | null }) {
  return [client, area.fieldName, area.name].filter(Boolean).join(' — ').slice(0, 255);
}
async function database() { const db = await getDb(); if (!db) throw new TRPCError({code:'INTERNAL_SERVER_ERROR',message:'Banco indisponível.'}); return db; }

export const clientAreasRouter = router({
  list: protectedProcedure.input(z.object({ clientId: z.number().int().positive() })).query(async ({input,ctx}) => {
    const db = await database();
    const rows = await db.select().from(clientAreas).where(eq(clientAreas.clientId,input.clientId)).orderBy(clientAreas.id);
    if (ctx.user.role === 'admin') return rows;
    const [perm] = await db.select().from(userPermissions).where(eq(userPermissions.userId,ctx.user.id)).limit(1);
    if (perm?.allowedClientIds) {
      const ids = JSON.parse(perm.allowedClientIds);
      if (ids.length > 0 && !ids.includes(input.clientId)) return [];
    }
    if (perm?.allowedWorkLocationIds) {
      const ids = JSON.parse(perm.allowedWorkLocationIds);
      return rows.filter((a: any) => ids.includes(a.workLocationId));
    }
    return rows;
  }),
  create: adminProcedure.input(z.object({ clientId: z.number().int().positive(), name, fieldName: optionalText, notes:z.string().trim().max(5000).optional() })).mutation(async ({input,ctx}) => {
    const db = await database();
    return db.transaction(async (tx:any) => {
      const [client] = await tx.select({id:clients.id,name:clients.name}).from(clients).where(eq(clients.id,input.clientId)).limit(1);
      if(!client) throw new TRPCError({code:'NOT_FOUND',message:'Cliente não encontrado.'});
      const [duplicate] = await tx.select({id:clientAreas.id}).from(clientAreas).where(and(eq(clientAreas.clientId,input.clientId),eq(clientAreas.name,input.name), input.fieldName ? eq(clientAreas.fieldName,input.fieldName) : isNull(clientAreas.fieldName))).limit(1);
      if(duplicate) throw new TRPCError({code:'CONFLICT',message:'Já existe uma área com esse nome neste cliente.'});
      const [location] = await tx.insert(gpsLocations).values({name:locationName(client.name,input),clientId:input.clientId,latitude:'',longitude:'',radiusMeters:2000,isActive:1,notes:'Local de custos da área. GPS ainda não informado; sem detecção automática.',createdBy:ctx.user.id,createdByName:ctx.user.name});
      const [created] = await tx.insert(clientAreas).values({...input,fieldName:input.fieldName||null,workLocationId:Number(location.insertId),agreementStatus:'pending',createdBy:ctx.user.id});
      return {success:true,id:Number(created.insertId),workLocationId:Number(location.insertId)};
    });
  }),
  update: adminProcedure.input(z.object({
    id:z.number().int().positive(),name:name.optional(),fieldName:optionalText,notes:z.string().trim().max(5000).optional(),
    unit:z.enum(['ton','m3']).optional(),unitPrice:z.string().regex(/^\d{1,12}([.,]\d{1,4})?$/,'Informe um valor numérico válido.').optional(),
    paymentMethod:z.string().trim().max(100).optional(),paymentTermDays:z.number().int().min(0).max(3650).optional(),
    billingCycle:z.enum(['manual','semanal','quinzenal','mensal']).optional(),agreementStatus:z.enum(['pending','confirmed']).optional(),
  })).mutation(async ({input,ctx}) => {
    const db = await database();
    const result = await db.transaction(async (tx:any) => {
      const [existing] = await tx.select().from(clientAreas).where(eq(clientAreas.id,input.id)).limit(1);
      if(!existing) throw new TRPCError({code:'NOT_FOUND',message:'Área não encontrada.'});
      const {id,...patch} = input;
      const data = {...patch,...(patch.fieldName!==undefined ? {fieldName:patch.fieldName||null} : {}),...(patch.unitPrice!==undefined ? {unitPrice:patch.unitPrice.replace(',','.')} : {})};
      const merged = {...existing,...data};
      if(merged.agreementStatus==='confirmed') requireConfirmedArea(merged);
      if ((patch.name && patch.name !== existing.name) || (patch.fieldName !== undefined && (patch.fieldName || null) !== existing.fieldName)) {
        const [dup] = await tx.select({id:clientAreas.id}).from(clientAreas).where(and(eq(clientAreas.clientId,existing.clientId),eq(clientAreas.name,merged.name), merged.fieldName ? eq(clientAreas.fieldName,merged.fieldName) : isNull(clientAreas.fieldName))).limit(1);
        if (dup) throw new TRPCError({code:'CONFLICT',message:'Já existe uma área com esse nome.'});
      }
      await tx.update(clientAreas).set(data).where(eq(clientAreas.id,id));
      // Primeira confirmação: fixa condições nas cargas registradas enquanto
      // o acordo estava pendente. Nunca reprecifica snapshots já existentes.
      if (merged.agreementStatus === 'confirmed') {
        await tx.update(cargoLoads).set({
          agreedUnit: merged.unit, agreedUnitPrice: String(merged.unitPrice),
          agreedPaymentMethod: merged.paymentMethod, agreedPaymentTermDays: merged.paymentTermDays,
        }).where(and(eq(cargoLoads.clientId, existing.clientId), eq(cargoLoads.areaId, id), isNull(cargoLoads.agreedUnitPrice)));
      }
      if(patch.name!==undefined || patch.fieldName!==undefined) {
        const [client] = await tx.select({name:clients.name}).from(clients).where(eq(clients.id,existing.clientId)).limit(1);
        await tx.update(gpsLocations).set({name:locationName(client.name,merged)}).where(eq(gpsLocations.id,existing.workLocationId));
      }
      return {success:true};
    });
    if (input.agreementStatus === 'confirmed') {
      const {generateFinancialEntriesForCargo} = await import('../autoFinancial');
      const delivered = await db.select().from(cargoLoads).where(and(eq(cargoLoads.areaId,input.id),eq(cargoLoads.status,'entregue'))).limit(500);
      for (const cargo of delivered) await generateFinancialEntriesForCargo(cargo,ctx.user.id,ctx.user.name||'Responsável');
    }
    return result;
  }),
});
