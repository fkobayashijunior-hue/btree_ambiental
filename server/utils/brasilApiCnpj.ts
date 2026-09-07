// Cliente para a BrasilAPI (https://brasilapi.com.br/api/cnpj/v1/{cnpj}) — gratuita, sem chave.
// Usada para descobrir a razão social e o CNAE de um CNPJ encontrado no extrato bancário.

export type CnpjInfo = {
  razaoSocial: string;
  cnaeCodigo: string;
  cnaeDescricao: string;
};

export async function consultarCnpjBrasilApi(cnpj: string): Promise<CnpjInfo | null> {
  const cnpjLimpo = cnpj.replace(/\D/g, "");
  if (cnpjLimpo.length !== 14) return null;

  try {
    // A BrasilAPI bloqueia (403) requisições sem um User-Agent de navegador.
    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/json",
      },
    });
    if (!resp.ok) return null;
    const data: any = await resp.json();

    const razaoSocial = data.razao_social ?? data.nome_fantasia ?? "";
    const cnaeCodigo = data.cnae_fiscal ? String(data.cnae_fiscal) : "";
    const cnaeDescricao = data.cnae_fiscal_descricao ?? "";

    if (!razaoSocial && !cnaeDescricao) return null;
    return { razaoSocial, cnaeCodigo, cnaeDescricao };
  } catch (e: any) {
    console.warn(`[BrasilAPI] Falha ao consultar CNPJ ${cnpjLimpo}:`, e?.message);
    return null;
  }
}
