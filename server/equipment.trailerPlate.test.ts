import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./db', () => ({getDb:vi.fn()}));
vi.mock('./cloudinary', () => ({cloudinaryUpload:vi.fn()}));
import { getDb } from './db';
import { sectorsRouter } from './routers/sectors';
import { equipmentDetailRouter } from './routers/equipmentDetail';
import { trailerPlateInput } from './lib/trailerPlate';
import { equipment } from '../drizzle/schema';
const context:any={user:{id:1,role:'admin',name:'Teste'},req:{headers:{}},res:{}};
let row:any,values:any,set:any,select:any;
beforeEach(()=>{
 row={id:99,name:'Caminhão de teste',typeId:1,status:'ativo',licensePlate:'ABC1D23',trailerPlate:null};
 values=vi.fn(async(data:any)=>{row={...row,...data};return [{insertId:99}];});
 set=vi.fn((data:any)=>({where:vi.fn(async()=>{for(const [k,v] of Object.entries(data))if(v!==undefined)row[k]=v;return [{affectedRows:1}];})}));
 select=vi.fn(()=>{const q:any={};for(const k of ['from','where','leftJoin','orderBy','limit'])q[k]=()=>q;q.then=(resolve:any,reject:any)=>Promise.resolve([{...row}]).then(resolve,reject);return q;});
 vi.mocked(getDb).mockResolvedValue({select,insert:()=>({values}),update:()=>({set})} as any);
});
describe('Placa da carreta',()=>{
 it.each(['ABC-1234','ABC1234','ABC1D23','ABC-1D23'])('aceita placa %s',value=>expect(trailerPlateInput.parse(value)).toBe(value));
 it('normaliza espaços e letras minúsculas',()=>expect(trailerPlateInput.parse(' abc1d23 ')).toBe('ABC1D23'));
 it.each(['','   ',null])('permite remover placa (%s)',value=>expect(trailerPlateInput.parse(value)).toBeNull());
 it('aceita ausência para compatibilidade com cadastros antigos',()=>expect(trailerPlateInput.parse(undefined)).toBeUndefined());
 it.each(['ABC','ABCD1234','<script>','ABC12345'])('rejeita entrada inválida %s',value=>expect(trailerPlateInput.safeParse(value).success).toBe(false));
 it('cria o equipamento com as duas placas independentes',async()=>{
  await sectorsRouter.createCaller(context).createEquipment({name:row.name,typeId:1,licensePlate:'ABC1D23',trailerPlate:' def-1234 '});
  expect(values).toHaveBeenCalledWith(expect.objectContaining({licensePlate:'ABC1D23',trailerPlate:'DEF-1234'}));
 });
 it('salva, reabre pela lista e fornece a placa para a ficha PDF',async()=>{
  const caller=sectorsRouter.createCaller(context);
  await caller.updateEquipment({id:99,trailerPlate:'def4g56'});
  const list=await caller.listEquipment({});expect(list[0].trailerPlate).toBe('DEF4G56');
  const detail=await equipmentDetailRouter.createCaller(context).getById({id:99});
  expect(detail?.trailerPlate).toBe('DEF4G56');expect(detail?.licensePlate).toBe('ABC1D23');
  expect(select).toHaveBeenCalledWith(expect.objectContaining({trailerPlate:equipment.trailerPlate}));
 });
 it('encontra caminhão pela placa da carreta',async()=>{
  row.trailerPlate='DEF4G56';const caller=sectorsRouter.createCaller(context);
  expect(await caller.listEquipment({search:'def4g56'})).toHaveLength(1);
  expect(await caller.listEquipment({search:'ZZZ9999'})).toHaveLength(0);
 });
 it('campo omitido em edição parcial não apaga a placa existente',async()=>{
  row.trailerPlate='DEF4G56';await sectorsRouter.createCaller(context).updateEquipment({id:99,brand:'DAF'});
  expect(set.mock.calls[0][0]).not.toHaveProperty('trailerPlate');expect(row.trailerPlate).toBe('DEF4G56');
 });
 it.each(['',null])('limpar campo salva null e preserva a placa do caminhão',async value=>{
  row.trailerPlate='DEF4G56';await sectorsRouter.createCaller(context).updateEquipment({id:99,trailerPlate:value});
  expect(row.trailerPlate).toBeNull();expect(row.licensePlate).toBe('ABC1D23');
 });
 it('entrada inválida não grava no banco',async()=>{
  await expect(sectorsRouter.createCaller(context).updateEquipment({id:99,trailerPlate:'<script>'})).rejects.toThrow();expect(set).not.toHaveBeenCalled();
 });
});
