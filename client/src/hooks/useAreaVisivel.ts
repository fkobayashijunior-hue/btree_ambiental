// Celular (toque): acompanha a área realmente visível da tela (descontando teclado e barras do navegador),
// para janelas em tela cheia ficarem acima do teclado e com o cabeçalho sempre à vista.
import { useEffect, useState } from "react";

export function useAreaVisivel(ativo: boolean) {
  const toque = typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
  const [vv, setVv] = useState<{ h: number; top: number } | null>(null);

  useEffect(() => {
    if (!ativo || !toque || typeof window === "undefined" || !window.visualViewport) return;
    const v = window.visualViewport;
    const atualizar = () => setVv({ h: v.height, top: v.offsetTop });
    atualizar();
    // Ao fechar o teclado o iPhone costuma deixar a página deslocada: volta ao topo e recalcula.
    let t: any;
    const aoSairDoCampo = () => { clearTimeout(t); t = setTimeout(() => { window.scrollTo(0, 0); atualizar(); }, 120); };
    // Ao tocar num campo, rola até ele ficar no meio da área visível (acima do teclado).
    const aoEntrarNoCampo = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      setTimeout(() => el.scrollIntoView?.({ block: "center", behavior: "smooth" }), 320);
    };
    v.addEventListener("resize", atualizar); v.addEventListener("scroll", atualizar);
    document.addEventListener("focusout", aoSairDoCampo);
    document.addEventListener("focusin", aoEntrarNoCampo);
    return () => {
      clearTimeout(t);
      v.removeEventListener("resize", atualizar); v.removeEventListener("scroll", atualizar);
      document.removeEventListener("focusout", aoSairDoCampo); document.removeEventListener("focusin", aoEntrarNoCampo);
      setVv(null);
    };
  }, [ativo, toque]);

  return { toque, vv };
}

/** Estilo para um DialogContent ocupar a área visível inteira no celular (undefined no computador). */
export function estiloTelaCheia(toque: boolean, vv: { h: number; top: number } | null): React.CSSProperties | undefined {
  if (!toque) return undefined;
  return { top: vv?.top ?? 0, left: 0, transform: "none", translate: "none", width: "100%", maxWidth: "none", height: vv?.h ?? "100dvh", maxHeight: "none", borderRadius: 0 };
}
