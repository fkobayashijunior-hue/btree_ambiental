import {describe,it,expect} from 'vitest';
import {normalizeAreaId,sameArea,requireConfirmedArea,getCargoFinancialValue,getAreaPriceTerms,areaAgreementIsComplete} from './lib/clientAreaScope';
const client={pricePerTon:'130.00',paymentTermDays:21,billingCycle:'mensal'};
const area={id:2,clientId:7,agreementStatus:'confirmed',unit:'ton',unitPrice:'90.00',paymentMethod:'PIX',paymentTermDays:0,billingCycle:'manual'};
describe('isolamento financeiro de áreas',()=>{
  it('mantém undefined/null/0 no escopo legado e não confunde com a Área 2',()=>{
    expect(normalizeAreaId(undefined)).toBeNull(); expect(normalizeAreaId(0)).toBeNull();
    expect(sameArea(null,undefined)).toBe(true); expect(sameArea(null,2)).toBe(false); expect(sameArea(2,3)).toBe(false);
    expect(()=>normalizeAreaId(-1)).toThrow(); expect(()=>normalizeAreaId(1.5)).toThrow();
  });
  it('preserva o cálculo antigo sem reclassificar históricos por data/local',()=>{
    expect(getCargoFinancialValue({areaId:null,workLocationId:3,weightNetKg:'10000'},client)).toBe(1300);
  });
  it('não copia preço ou prazo antigos para uma área pendente',()=>{
    const pending={...area,agreementStatus:'pending',unit:null,unitPrice:null};
    expect(getCargoFinancialValue({areaId:2,weightNetKg:'10000'},client,pending)).toBeNull();
    expect(getAreaPriceTerms(client,pending)).toBeNull(); expect(()=>requireConfirmedArea(pending)).toThrow(/configurar/);
  });
  it('área positiva sem dados nunca faz fallback para o cliente',()=>{
    expect(getCargoFinancialValue({areaId:2,weightNetKg:'10000'},client)).toBeNull();
    expect(getCargoFinancialValue({areaId:3,weightNetKg:'10000'},client,area)).toBeNull();
  });
  it('usa preço próprio e preserva prazo à vista zero',()=>{
    expect(getCargoFinancialValue({areaId:2,weightNetKg:'10000'},client,area)).toBe(900);
    expect(getAreaPriceTerms(client,area)?.paymentTermDays).toBe(0);
  });
  it('calcula m³ usando volume final quando informado',()=>{
    expect(getCargoFinancialValue({areaId:2,volumeM3:'30',finalVolumeM3:'25',weightNetKg:'10000'},client,{...area,unit:'m3',unitPrice:'10'})).toBe(250);
  });
  it('mantém preço salvo na carga após edição de condições da área',()=>{
    expect(getCargoFinancialValue({areaId:2,weightNetKg:'10000',agreedUnit:'ton',agreedUnitPrice:'75'},client,{...area,unitPrice:'100'})).toBe(750);
  });
  it('exige todos os termos comerciais para confirmar o acordo',()=>{
    expect(areaAgreementIsComplete(area)).toBe(true);
    for(const partial of [{unit:null},{unitPrice:'0'},{paymentMethod:''},{paymentTermDays:null},{paymentTermDays:-1},{billingCycle:null}]) expect(areaAgreementIsComplete({...area,...partial})).toBe(false);
  });
  it('aceita decimal com vírgula sem NaN e arredonda centavos',()=>{
    expect(getCargoFinancialValue({areaId:2,volumeM3:'1,333'},client,{...area,unit:'m3',unitPrice:'10,25'})).toBe(13.66);
  });
});
