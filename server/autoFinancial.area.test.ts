import {describe,it,expect,vi,beforeEach} from 'vitest';
vi.mock('./db',()=>({getDb:vi.fn()}));
import {getDb} from './db';
import {generateFinancialEntriesForCargo} from './autoFinancial';
const client={id:7,name:'Cliente',pricePerTon:'999'};
const area={id:2,clientId:7,name:'Área 2',agreementStatus:'confirmed',unit:'m3',unitPrice:'80',paymentMethod:'PIX',paymentTermDays:0,billingCycle:'manual'};
function dbFake(rows:any[][]){const values=vi.fn().mockResolvedValue([{insertId:1}]);const db:any={select:()=>{const data=rows.shift()||[];const q:any={};for(const k of ['from','where','limit'])q[k]=()=>q;q.then=(a:any,b:any)=>Promise.resolve(data).then(a,b);return q;},insert:()=>({values})};vi.mocked(getDb).mockResolvedValue(db);return values;}
beforeEach(()=>vi.clearAllMocks());
describe('custos automáticos por área',()=>{
 it('área pendente não gera custo com preço do cliente',async()=>{const values=dbFake([[],[client],[{...area,agreementStatus:'pending',unitPrice:null}]]);await generateFinancialEntriesForCargo({id:12,clientId:7,areaId:2,weightNetKg:'10000',volumeM3:'25',date:'2026-09-18'},1,'Teste');expect(values).not.toHaveBeenCalled();});
 it('gera despesa própria por m³ mesmo se a receita já existe',async()=>{const values=dbFake([[{type:'receita'}],[client],[area]]);await generateFinancialEntriesForCargo({id:12,clientId:7,areaId:2,volumeM3:'25',date:'2026-09-18'},1,'Teste');expect(values).toHaveBeenCalledWith(expect.objectContaining({areaId:2,type:'despesa',amount:(25*80).toFixed(2),paymentMethod:'PIX'}));});
 it('não duplica despesa própria já registrada',async()=>{const values=dbFake([[{type:'receita'},{type:'despesa',category:'Pagamento Fornecedor Madeira'}]]);await generateFinancialEntriesForCargo({id:12,clientId:7,areaId:2,volumeM3:'25',date:'2026-09-18'},1,'Teste');expect(values).not.toHaveBeenCalled();});
});
