import {describe,it,expect,vi,beforeEach} from 'vitest';
vi.mock('./db',()=>({getDb:vi.fn()}));
vi.mock('./storage',()=>({storagePut:vi.fn().mockResolvedValue({url:'https://example.invalid/test.pdf'})}));
vi.mock('./routers/notifications',()=>({notifyAdmComercial:vi.fn(),createNotification:vi.fn()}));
vi.mock('mysql2/promise',()=>({default:{createConnection:vi.fn().mockRejectedValue(new Error('TEST: acesso externo proibido'))}}));
import {getDb} from './db';
import {clientAdvancesRouter} from './routers/clientAdvances';
import {cargoLoadsRouter} from './routers/cargoLoads';
import {decorateClosings,calculatePortalTotals} from './routers/clientPortal';
const ctx:any={user:{id:1,name:'Admin teste',role:'admin'},req:{},res:{}};
const client={id:7,name:'Cliente teste',pricePerTon:'999',paymentTermDays:21};
const area={id:2,clientId:7,name:'Área 2',workLocationId:20,agreementStatus:'confirmed',unit:'ton',unitPrice:'100',paymentMethod:'PIX',paymentTermDays:0,billingCycle:'manual'};
const advance={id:10,clientId:7,areaId:2,amount:'2000',balanceRemaining:'1000',status:'ativo'};
function fakeDb(answers:any[][]){
 const values=vi.fn().mockResolvedValue([{insertId:50}]);const sets=vi.fn().mockReturnValue({where:vi.fn().mockResolvedValue(undefined)});
 const db:any={select:vi.fn(()=>{const rows=answers.shift()||[];const q:any={};for(const k of ['from','where','limit','orderBy','leftJoin','innerJoin','for'])q[k]=vi.fn(()=>q);q.then=(yes:any,no:any)=>Promise.resolve(rows).then(yes,no);return q;}),insert:vi.fn(()=>({values})),update:vi.fn(()=>({set:sets})),delete:vi.fn(()=>({where:vi.fn().mockResolvedValue(undefined)})),execute:vi.fn().mockResolvedValue([[]])};
 db.transaction=async(fn:any)=>fn(db);vi.mocked(getDb).mockResolvedValue(db);return {db,values,sets};
}
beforeEach(()=>vi.clearAllMocks());
describe('rotas financeiras isoladas por área',()=>{
 it('rejeita adiantamento de outra área antes de gravar',async()=>{const {values,sets}=fakeDb([[{...advance,areaId:3}]]);await expect(clientAdvancesRouter.createCaller(ctx).applyDeduction({advanceId:10,clientId:7,areaId:2,amount:100,date:'2026-09-18'})).rejects.toThrow(/áreas/);expect(values).not.toHaveBeenCalled();expect(sets).not.toHaveBeenCalled();});
 it('rejeita carga de outra área antes de abater',async()=>{const {values}=fakeDb([[advance],[area],[{id:12,clientId:7,areaId:3}]]);await expect(clientAdvancesRouter.createCaller(ctx).applyDeduction({advanceId:10,clientId:7,areaId:2,cargoLoadId:12,amount:100,date:'2026-09-18'})).rejects.toThrow(/áreas/);expect(values).not.toHaveBeenCalled();});
 it('bloqueia abatimento enquanto acordo está pendente',async()=>{const {values}=fakeDb([[advance],[{...area,agreementStatus:'pending'}]]);await expect(clientAdvancesRouter.createCaller(ctx).applyDeduction({advanceId:10,clientId:7,areaId:2,amount:100,date:'2026-09-18'})).rejects.toThrow(/configurar/);expect(values).not.toHaveBeenCalled();});
 it('não aceita lote com uma carga fora do escopo',async()=>{const {values,sets}=fakeDb([[advance],[client],[area],[]]);await expect(clientAdvancesRouter.createCaller(ctx).applyAutoDeductionByLoads({advanceId:10,clientId:7,areaId:2,loads:[{id:999,date:'2026-09-18',valueAmount:0.01}]})).rejects.toThrow(/não pertence/);expect(values).not.toHaveBeenCalled();expect(sets).not.toHaveBeenCalled();});
 it('não reduz o adiantamento abaixo do valor já consumido',async()=>{const {sets}=fakeDb([[advance]]);await expect(clientAdvancesRouter.createCaller(ctx).update({id:10,areaId:2,amount:500})).rejects.toThrow(/abatimentos/);expect(sets).not.toHaveBeenCalled();});
 it('comprovante de outra área não é gravado',async()=>{const {sets}=fakeDb([[{...advance,areaId:3}]]);await expect(clientAdvancesRouter.createCaller(ctx).uploadReceipt({advanceId:10,areaId:2,fileBase64:'aGVsbG8='})).rejects.toThrow(/áreas/);expect(sets).not.toHaveBeenCalled();});
 it('não paga carga cuja área ainda está pendente',async()=>{const {sets}=fakeDb([[{id:12,clientId:7,areaId:2}],[{...area,agreementStatus:'pending'}]]);await expect(cargoLoadsRouter.createCaller(ctx).markAsPaid({id:12,clientId:7,areaId:2})).rejects.toThrow(/configurar/);expect(sets).not.toHaveBeenCalled();});
 it('fecha com preço próprio, saldo parcial e prazo zero, ignorando preço adulterado',async()=>{
  const {values}=fakeDb([[client],[area],[{id:12,clientId:7,areaId:2,status:'entregue',paymentStatus:'sem_boleto',weightNetKg:'10000',volumeM3:'25',agreedUnit:'ton',agreedUnitPrice:'100'}],[{cargoLoadId:12,amount:'200'}]]);
  const result=await cargoLoadsRouter.createCaller(ctx).createWeeklyClosing({clientId:7,areaId:2,weekStart:'2026-09-12',weekEnd:'2026-09-18',pricePerTon:'99999'});
  expect(result.id).toBe(50);expect(values).toHaveBeenCalledWith(expect.objectContaining({areaId:2,areaScopeKey:2,pricePerTon:'100',priceUnit:'ton',totalAmount:(10*100-200).toFixed(2),dueDate:'2026-09-18 12:00:00'}));
 });
 it('não gera fechamento com acordo pendente',async()=>{const {values}=fakeDb([[client],[{...area,agreementStatus:'pending'}]]);await expect(cargoLoadsRouter.createCaller(ctx).createWeeklyClosing({clientId:7,areaId:2,weekStart:'2026-09-12',weekEnd:'2026-09-18'})).rejects.toThrow(/configurar/);expect(values).not.toHaveBeenCalled();});
 it('usa m³ e não o preço do cliente em fechamentos por volume',async()=>{const {values}=fakeDb([[client],[{...area,unit:'m3',unitPrice:'80'}],[{id:12,areaId:2,clientId:7,status:'entregue',paymentStatus:'sem_boleto',volumeM3:'25',weightNetKg:'10000'}],[]]);await cargoLoadsRouter.createCaller(ctx).createWeeklyClosing({clientId:7,areaId:2,weekStart:'2026-09-12',weekEnd:'2026-09-18'});expect(values).toHaveBeenCalledWith(expect.objectContaining({priceUnit:'m3',totalAmount:(25*80).toFixed(2),totalVolumeM3:'25.000'}));});
 it('preserva snapshot de preço ao editar apenas peso',async()=>{const {sets}=fakeDb([[{id:12,clientId:7,areaId:2,paymentStatus:'sem_boleto',agreedUnit:'ton',agreedUnitPrice:'75'}],[client],[],[area],[{invoiceUrl:null}],[],[]]);await cargoLoadsRouter.createCaller(ctx).update({id:12,weightNetKg:'11000'});const update=sets.mock.calls.find(([x])=>x.weightNetKg==='11000')?.[0];expect(update).toBeTruthy();expect(update).not.toHaveProperty('agreedUnitPrice');expect(update).toMatchObject({areaId:2,workLocationId:20});});
 it('não recalcula o valor de um fechamento já emitido',async()=>{const [out]=await decorateClosings([{id:1,areaId:2,totalAmount:'800',totalLoads:1,totalWeightKg:'10000',weekStart:'2026-09-12',weekEnd:'2026-09-18'}],[{id:12,date:'2026-09-15',portalValue:9999,weightNetKg:'20000'}],false);expect(out.portalAmount).toBe(800);expect(out.portalWeightKg).toBe(10000);});
 it('combina abatimento e saldo do fechamento sem dupla contagem',()=>{const totals=calculatePortalTotals({areaId:2,loads:[{status:'entregue',portalValue:1000}],advances:[advance],deductions:[{amount:200,cargoLoadId:12},{amount:300,weeklyClosingId:1}],weeklyClosings:[{id:1,areaId:2,status:'pago',portalAmount:800}],manualPayments:[]});expect(totals.valorPago).toBe(1000);expect(totals.valorAReceber).toBe(0);});
});
