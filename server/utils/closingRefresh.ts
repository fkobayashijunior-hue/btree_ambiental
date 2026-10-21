// Mantém o valor gravado dos fechamentos semanais (cargo_weekly_closings) igual ao valor ATUAL das cargas.
//
// O fechamento é criado na sexta à noite; cargas entregues ou pesadas depois mudavam o valor real,
// mas o total gravado continuava o antigo — e era esse total que aparecia em relatórios e era
// marcado como pago. A tela de Fechamentos já recalculava ao vivo; aqui o banco passa a acompanhar.
//
// Regras de segurança:
//  • nunca altera fechamento já PAGO (é histórico do que foi pago);
//  • nunca altera fechamento cujas cargas têm abatimento de adiantamento (o total gravado é líquido
//    do abatimento, e o recálculo bruto o sobrescreveria).
import { SQL_CARGAS_FECHAMENTO, SQL_FECHAMENTO_VIVO, SQL_KG, sqlNum } from "./financeiroCanonico";

type Conn = { execute: (sql: string, params?: any[]) => Promise<any> };

export async function atualizarTotaisFechamentos(conn: Conn, opts: { id?: number } = {}): Promise<number> {
  const semAbatimento = `
    NOT EXISTS (SELECT 1 FROM client_advance_deductions d WHERE d.weekly_closing_id = f.id)
    AND NOT EXISTS (
      SELECT 1 FROM client_advance_deductions d JOIN cargo_loads l2 ON l2.id = d.cargo_load_id
      WHERE l2.client_id = f.client_id AND l2.area_id <=> f.area_id
        AND DATE(COALESCE(l2.delivery_date, l2.date)) BETWEEN f.week_start AND f.week_end)`;

  const sql = `
    UPDATE cargo_weekly_closings f
    LEFT JOIN clients cc ON cc.id = f.client_id
    SET f.total_loads = COALESCE(${SQL_CARGAS_FECHAMENTO("COUNT(*)")}, 0),
        f.total_weight_kg = COALESCE(${SQL_CARGAS_FECHAMENTO(`SUM(${SQL_KG})`)}, 0),
        f.total_volume_m3 = COALESCE(${SQL_CARGAS_FECHAMENTO(`SUM(${sqlNum("l.volume_m3")})`)}, 0),
        f.total_amount = ${SQL_FECHAMENTO_VIVO("f", "cc")}
    WHERE f.status <> 'pago' ${opts.id ? "AND f.id = ?" : ""}
      AND ${semAbatimento}
      AND (ABS(${SQL_FECHAMENTO_VIVO("f", "cc")} - f.total_amount) > 0.01
           OR COALESCE(${SQL_CARGAS_FECHAMENTO("COUNT(*)")}, 0) <> f.total_loads)`;

  const [res] = await conn.execute(sql, opts.id ? [opts.id] : []);
  return Number((res as any)?.affectedRows ?? 0);
}
