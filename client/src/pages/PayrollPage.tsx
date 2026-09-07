import { useState } from "react";
import { Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import PayrollSheet from "./PayrollSheet";

// O mês corrente ainda está em andamento (cargas/presenças continuam sendo lançadas), então o
// mês anterior — já fechado e estável — é o padrão ideal para conferir e fechar a Folha.
function getPreviousMonth() {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayrollPage() {
  const [referenceMonth, setReferenceMonth] = useState(getPreviousMonth());

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Users className="h-7 w-7" /> Folha de Pagamento
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Controle mensal de salários, diárias e comissões dos colaboradores</p>
        </div>
        <Input
          type="month"
          value={referenceMonth}
          onChange={e => setReferenceMonth(e.target.value)}
          className="w-40"
        />
      </div>

      <PayrollSheet referenceMonth={referenceMonth} />
    </div>
  );
}
