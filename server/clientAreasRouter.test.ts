import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('./db', () => ({getDb:vi.fn()}));
import {getDb} from './db';
import {clientAreasRouter} from './routers/clientAreas';
const ctx:any={user:{id:1,name:'Teste',role:'admin'},req:{},res:{}};
function fakeDb(rows:any[][]){
  const values=vi.fn().mockResolvedValue([{insertId:11}]);
  const updates=vi.fn().mockReturnValue({where:vi.fn().mockResolvedValue(undefined)});
  const db:any={
    select:vi.fn(()=>({from:()=>({where:()=>({limit:()=>Promise.resolve(rows.shift()||[]),orderBy:()=>Promise.resolve(rows.shift()||[])})})})),
    insert:vi.fn(()=>({values})),update:vi.fn(()=>({set:updates})),
  };
  db.transaction=async(fn:any)=>fn(db);
  return {db,values,updates};
}
beforeEach(()=>vi.clearAllMocks());
describe('cadastro de áreas',()=>{
  it('cria local próprio e acordo pendente sem copiar condições do cliente',async()=>{
    const {db,values}=fakeDb([[{id:7,name:'Luciano Ribeiro',pricePerTon:'130',paymentTermDays:21}],[]]);
    vi.mocked(getDb).mockResolvedValue(db);
    const out=await clientAreasRouter.createCaller(ctx).create({clientId:7,name:'Área 2'});
    expect(out.success).toBe(true);
    expect(values.mock.calls[0][0]).toMatchObject({name:'Luciano Ribeiro — Área 2',latitude:'',longitude:'',clientId:7});
    expect(values.mock.calls[1][0]).toMatchObject({agreementStatus:'pending',workLocationId:11});
    expect(values.mock.calls[1][0]).not.toHaveProperty('unitPrice');
    expect(values.mock.calls[1][0]).not.toHaveProperty('paymentTermDays');
  });
  it('não confirma sem os acordos comerciais',async()=>{
    const {db,updates}=fakeDb([[{id:2,clientId:7,name:'Área 2',agreementStatus:'pending',workLocationId:11}]]);
    vi.mocked(getDb).mockResolvedValue(db);
    await expect(clientAreasRouter.createCaller(ctx).update({id:2,agreementStatus:'confirmed'})).rejects.toThrow(/configurar/);
    expect(updates).not.toHaveBeenCalled();
  });
  it('salva acordo próprio incluindo pagamento à vista',async()=>{
    const {db,updates}=fakeDb([[{id:2,clientId:7,name:'Área 2',agreementStatus:'pending',workLocationId:11}]]);
    vi.mocked(getDb).mockResolvedValue(db);
    await clientAreasRouter.createCaller(ctx).update({id:2,agreementStatus:'confirmed',unit:'m3',unitPrice:'80,50',paymentMethod:'PIX',paymentTermDays:0,billingCycle:'manual'});
    expect(updates).toHaveBeenCalledWith(expect.objectContaining({unitPrice:'80.50',paymentTermDays:0,agreementStatus:'confirmed'}));
  });
  it('não duplica área existente',async()=>{
    const {db,values}=fakeDb([[{id:7,name:'Luciano Ribeiro'}],[{id:2}]]);
    vi.mocked(getDb).mockResolvedValue(db);
    await expect(clientAreasRouter.createCaller(ctx).create({clientId:7,name:'Área 2'})).rejects.toThrow(/Já existe/);
    expect(values).not.toHaveBeenCalled();
  });
  it('usuário sem administração não muda acordos',async()=>{
    await expect(clientAreasRouter.createCaller({...ctx,user:{...ctx.user,role:'user'}}).create({clientId:7,name:'Área 2'})).rejects.toThrow();
  });
});
