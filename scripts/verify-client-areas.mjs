import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
dotenv.config({path:process.env.BTREE_ENV_FILE||'.env',quiet:true});
const mode=process.argv[2]||'baseline';
assert(['baseline','verify'].includes(mode));
const db=await mysql.createConnection(process.env.DB_HOST ? {host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,port:Number(process.env.DB_PORT||3306)} : process.env.DATABASE_URL);
const baselinePath='/root/btree-backups/client-areas-api-baseline.json';
try {
  const [[client]]=await db.execute('SELECT id,email FROM clients WHERE id=7');
  assert(client?.email,'Cliente sem acesso configurado.');
  async function portal(areaId,includeArea=true){
    const input={clientId:client.id,email:client.email,...(includeArea?{areaId}: {})};
    const url='http://127.0.0.1:3000/api/trpc/clientPortal.getPortalData?input='+encodeURIComponent(JSON.stringify({json:input}));
    const response=await fetch(url);const body=await response.json();
    assert(response.ok && body.result?.data?.json,'Falha na consulta ao portal');
    return body.result.data.json;
  }
  function digest(data){return {
    loads:data.loads.map(x=>({id:x.id,invoiceNumber:x.invoiceNumber,status:x.status,weightNetKg:x.weightNetKg})).sort((a,b)=>a.id-b.id),
    closings:data.weeklyClosings.map(x=>({id:x.id,totalAmount:x.totalAmount,status:x.status})).sort((a,b)=>a.id-b.id),
    advances:data.advances.map(x=>({id:x.id,amount:x.amount,balanceRemaining:x.balanceRemaining,status:x.status})).sort((a,b)=>a.id-b.id),
    deductions:data.advanceDeductions.map(x=>({id:x.id,amount:x.amount,cargoLoadId:x.cargoLoadId})).sort((a,b)=>a.id-b.id),
    valorTotal:data.valorTotal,valorPago:data.valorPago,valorAReceber:data.valorAReceber,totalAdvanceBalance:data.totalAdvanceBalance
  };}
  const legacy=await portal(null,mode!=='baseline');
  if(mode==='baseline'){
    await fs.mkdir('/root/btree-backups',{recursive:true,mode:0o700});
    await fs.writeFile(baselinePath,JSON.stringify(digest(legacy),null,2),{mode:0o600});
    console.log('BASELINE_OK',JSON.stringify({loads:legacy.loads.length,closings:legacy.weeklyClosings.length,advances:legacy.advances.length}));
  }else{
    const baseline=JSON.parse(await fs.readFile(baselinePath,'utf8'));
    assert.deepEqual(digest(legacy),baseline,'Histórico ou totais da área original mudaram.');
    assert(!('password' in legacy.client),'Portal não deve expor hash de senha.');
    const [[area]]=await db.execute("SELECT id,work_location_id,agreement_status,unit_price,payment_method,payment_term_days FROM client_areas WHERE client_id=7 AND name='Área 2'");
    assert(area,'Área 2 ausente');assert.equal(area.agreement_status,'pending');assert.equal(area.unit_price,null);assert.equal(area.payment_method,null);assert.equal(area.payment_term_days,null);
    const second=await portal(area.id);
    assert.equal(second.areaPending,true);
    for(const field of ['loads','advances','advanceDeductions','weeklyClosings','payments','documents','replanting'])assert.equal(second[field].length,0,'Área nova herdou '+field);
    assert(legacy.areas.some(x=>x.id===area.id),'Seletor sem Área 2');
    console.log('VERIFY_OK',JSON.stringify({historicalLoadsPreserved:legacy.loads.length,originalTotalsUnchanged:true,areaId:area.id,workLocationId:area.work_location_id,agreement:'pending',crossAreaData:false,passwordHashExposed:false}));
  }
} finally {await db.end();}
