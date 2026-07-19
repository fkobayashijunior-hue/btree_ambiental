// @ts-nocheck
import { useState, useEffect } from "react";
import { getClientPrefix, buildClientCodeMap, getClientCode } from "@shared/clientCode";
import { BTREE_LOGO_B64, loadPdfAssets, generatePDFFromHtml } from "@/lib/pdfUtils";
import { formatBR, formatBRL } from "@/lib/formatBR";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Truck, Leaf, DollarSign, LogOut, TreePine, Mail, Lock, Eye, EyeOff, Phone, X, Weight, MapPin, ChevronDown, ChevronUp, Image as ImageIcon, Download, Smartphone, FileCheck, Calendar, CheckCircle2, TrendingUp, Globe, MessageCircle } from "lucide-react";

// ── HELPERS ──
// Fix timezone issue: date-only strings like "2026-05-08" are parsed as UTC midnight,
// which in Brazil (UTC-3) becomes May 7 at 21:00. Adding T12:00:00 prevents day shift.
function safeDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  const s = String(dateStr);
  if (s.length === 10 && s[4] === '-') return new Date(s + 'T12:00:00');
  if (s.length >= 10 && s[4] === '-' && s[7] === '-' && !s.includes('T')) {
    return new Date(s.slice(0, 10) + 'T12:00:00');
  }
  if (s.includes('T') && s.endsWith('Z') && s.includes('T00:00:00')) {
    return new Date(s.replace('T00:00:00.000Z', 'T12:00:00'));
  }
  return new Date(s);
}

// ── PWA INSTALL HOOK ──
function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('btree_pwa_dismissed') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('btree_pwa_dismissed', 'true'); } catch {}
  };

  return { canInstall: !!deferredPrompt && !isInstalled && !dismissed, isInstalled, install, dismiss };
}

// ── PWA INSTALL BANNER (melhorado) ──
function InstallBanner() {
  const { canInstall, isInstalled, install, dismiss } = useInstallPrompt();
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [iosDismissed, setIOSDismissed] = useState(() => {
    try { return localStorage.getItem('btree_ios_dismissed') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);
  }, []);

  if (isInstalled) return null;

  // iOS: show button that opens modal with visual guide
  if (isIOS && !iosDismissed) {
    return (
      <>
        <button
          onClick={() => setShowIOSModal(true)}
          className="w-full bg-gradient-to-r from-[#0d4f2e] to-[#1a5c3a] text-white rounded-2xl p-4 shadow-lg active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Download className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Salvar na Tela Inicial</p>
              <p className="text-green-200 text-xs mt-0.5">Acesse rápido como um aplicativo</p>
            </div>
          </div>
        </button>

        {/* Modal com guia visual para iOS */}
        {showIOSModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={() => setShowIOSModal(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm mx-4 mb-0 sm:mb-auto shadow-2xl animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setShowIOSModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0d4f2e] to-[#1a5c3a] flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Smartphone className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-black text-gray-900 text-lg">Salvar na Tela Inicial</h3>
                <p className="text-gray-500 text-sm mt-1">Siga os 3 passos abaixo:</p>
              </div>

              <div className="space-y-4">
                {/* Passo 1 */}
                <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Toque no botão Compartilhar</p>
                    <p className="text-gray-500 text-xs mt-0.5">O ícone <span className="inline-block text-blue-500 font-bold text-lg leading-none align-middle">↑</span> na barra do Safari (parte de baixo da tela)</p>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Adicionar à Tela de Início</p>
                    <p className="text-gray-500 text-xs mt-0.5">Role para baixo no menu e toque em <strong>"Adicionar à Tela de Início"</strong> (tem um ícone de <span className="font-bold">+</span>)</p>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Confirme tocando "Adicionar"</p>
                    <p className="text-gray-500 text-xs mt-0.5">Pronto! O app BTREE vai aparecer na sua tela inicial</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="flex-1 py-3 bg-[#0d4f2e] text-white font-bold rounded-xl text-sm hover:bg-[#1a5c3a] transition-colors"
                >
                  Entendi!
                </button>
                <button
                  onClick={() => {
                    setIOSDismissed(true);
                    setShowIOSModal(false);
                    try { localStorage.setItem('btree_ios_dismissed', 'true'); } catch {}
                  }}
                  className="px-4 py-3 text-gray-500 text-xs rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Não mostrar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Android/Desktop: show big install button
  if (!canInstall) return null;

  return (
    <div className="relative">
      <button
        onClick={install}
        className="w-full bg-gradient-to-r from-[#0d4f2e] to-[#1a5c3a] text-white rounded-2xl p-4 shadow-lg active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Download className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-base">Instalar Aplicativo</p>
            <p className="text-green-200 text-xs mt-0.5">Toque aqui para salvar na tela inicial</p>
          </div>
        </div>
      </button>
      <button
        onClick={dismiss}
        className="absolute -top-2 -right-2 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-300 shadow"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

type TrackingStatus = "aguardando" | "carregando" | "em_transito" | "pesagem_saida" | "descarregando" | "pesagem_chegada" | "finalizado";

const TRACKING_STEPS: { key: TrackingStatus; label: string; icon: string; desc: string }[] = [
  { key: "aguardando", label: "Aguardando", icon: "⏳", desc: "Carga aguardando início do carregamento" },
  { key: "carregando", label: "Carregando", icon: "📦", desc: "Carga sendo carregada no caminhão" },
  { key: "em_transito", label: "Em Trânsito", icon: "🚛", desc: "Caminhão a caminho do destino" },
  { key: "descarregando", label: "Descarregando", icon: "🏭", desc: "Carga sendo descarregada no destino" },
  { key: "pesagem_chegada", label: "Pesagem", icon: "⚖️", desc: "Realizando pesagem" },
  { key: "finalizado", label: "Finalizado", icon: "✅", desc: "Entrega concluída com sucesso" },
];

const BTREE_LOGO = BTREE_LOGO_B64; // base64 embedded, no CORS
const BTREE_LOGO_NEW = "/manus-storage/LOGO-BTREE-01_7a7571bc.jpeg";
const KOBAYASHI_LOGO = "https://res.cloudinary.com/djob7pxme/image/upload/v1773053506/btree-static/bubi6hkzpedz2tj7ti8v.png";

// ===== PDF FECHAMENTO SEMANAL =====
async function generateClosingPDF(closing: any, clientName: string, loads: any[], pricePerTon: number) {
  const [kobayashiB64, qrB64] = await loadPdfAssets();
  const weekStartFmt = closing.weekStart ? safeDate(closing.weekStart).toLocaleDateString('pt-BR') : '-';
  const weekEndFmt = closing.weekEnd ? safeDate(closing.weekEnd).toLocaleDateString('pt-BR') : '-';
  const totalWeightTon = closing.totalWeightKg ? formatBR(parseFloat(closing.totalWeightKg) / 1000, 2) : '0';
  const dueDateFmt = closing.dueDate ? safeDate(closing.dueDate).toLocaleDateString('pt-BR') : '-';
  const statusLabel = closing.status === 'pago' ? 'PAGO' : closing.status === 'atrasado' ? 'ATRASADO' : 'AGUARDANDO PAGAMENTO';
  const statusClass = closing.status === 'pago' ? 'badge-pago' : closing.status === 'atrasado' ? 'badge-atrasado' : 'badge-pendente';

  // Recalcular ao vivo pelas cargas do período (idêntico ao admin/PDF)
  const pdfWkStart = safeDate(closing.weekStart);
  const pdfWkEnd = safeDate(closing.weekEnd);
  pdfWkEnd.setHours(23, 59, 59, 999);
  const pdfLoads = loads.filter((l: any) => {
    const d = safeDate(l.deliveryDate || l.date);
    return d >= pdfWkStart && d <= pdfWkEnd;
  });
  const actualTotalLoads = pdfLoads.length;
  const actualTotalWeightKg = pdfLoads.reduce((acc: number, l: any) => acc + parseFloat(l.weightNetKg || l.weightOutKg || '0'), 0);
  const actualTotalWeightTon = formatBR(actualTotalWeightKg / 1000, 2);
  const actualTotalAmount = formatBR(actualTotalWeightKg / 1000 * parseFloat(String(closing.pricePerTon || pricePerTon)), 2);

  // Listar cargas do período para detalhamento no PDF (apenas visual)
  const weekStart = safeDate(closing.weekStart);
  const weekEnd = safeDate(closing.weekEnd);
  weekEnd.setHours(23, 59, 59, 999);
  const weekLoads = loads.filter((l: any) => {
    const d = safeDate(l.deliveryDate || l.date);
    return d >= weekStart && d <= weekEnd;
  });

  const loadsRows = weekLoads.map((l: any, i: number) => {
    const date = (l.deliveryDate || l.date) ? safeDate(l.deliveryDate || l.date).toLocaleDateString('pt-BR') : '-';
    const weight = l.weightNetKg || l.weightOutKg || '-';
    const weightTon = parseFloat(weight) > 0 ? formatBR(parseFloat(weight) / 1000, 3) : '-';
    const vol = l.volumeM3 || '-';
    const dest = l.destination || '-';
    const plate = l.vehiclePlate || '-';
    const driver = l.driverName || '-';
    const nf = l.invoiceNumber || '-';
    return `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${date}</td>
      <td>${nf}</td>
      <td>${dest}</td>
      <td>${plate}</td>
      <td>${driver}</td>
      <td style="text-align:right">${vol} m\u00b3</td>
      <td style="text-align:right">${weight} kg</td>
      <td style="text-align:right">${weightTon} ton</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Fechamento Semanal - ${clientName} - BTREE Ambiental</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }
  @page { size: A4; margin: 0; }
  .page { min-height: 100vh; display: flex; flex-direction: column; }
  .pdf-header { background: linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%); color: white; padding: 18px 32px; display: flex; align-items: center; gap: 20px; }
  .pdf-header img { height: 52px; filter: brightness(0) invert(1); }
  .pdf-header-text h1 { font-size: 20px; font-weight: bold; margin: 0; }
  .pdf-header-text p { font-size: 11px; opacity: 0.85; margin-top: 3px; }
  .pdf-subheader { background: #f0fdf4; padding: 12px 32px; border-bottom: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; }
  .badge-pago { background: #dcfce7; color: #166534; padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; }
  .badge-pendente { background: #fef9c3; color: #854d0e; padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; }
  .badge-atrasado { background: #fee2e2; color: #991b1b; padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; }
  .pdf-content { padding: 20px 32px; flex: 1; }
  .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 24px; margin-bottom: 20px; display: flex; gap: 32px; flex-wrap: wrap; }
  .summary-item { text-align: center; }
  .summary-item .label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
  .summary-item .value { font-size: 20px; font-weight: bold; color: #0d4f2e; }
  .summary-item .value.blue { color: #1d4ed8; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 16px; }
  table th { background: #0d4f2e; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
  table td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
  table tr:nth-child(even) { background: #f9fafb; }
  .pdf-footer { padding: 12px 32px; border-top: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
  .pdf-footer-left { display: flex; align-items: center; gap: 10px; }
  .pdf-footer-left img { height: 28px; }
  .pdf-footer-text { font-size: 10px; color: #555; }
  .pdf-footer-text strong { color: #0d4f2e; }
  .pdf-footer-text a { color: #15803d; text-decoration: none; font-weight: bold; }
  .pdf-footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .pdf-footer-right img { width: 60px; height: 60px; }
  .pdf-footer-right span { font-size: 9px; color: #555; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="page">
  <div class="pdf-header">
    <img src="${BTREE_LOGO}" alt="BTREE Ambiental" onerror="this.style.display='none'" />
    <div class="pdf-header-text">
      <h1>Fechamento Semanal</h1>
      <p>BTREE Empreendimentos LTDA &middot; btreeambiental.com &middot; Emitido em ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  </div>
  <div class="pdf-subheader">
    <div>
      <span style="font-size:15px;font-weight:700;color:#0d4f2e;">Cliente: ${clientName}</span><br/>
      <span style="font-size:12px;color:#6b7280;">Per\u00edodo: ${weekStartFmt} a ${weekEndFmt}</span>
    </div>
    <span class="${statusClass}">${statusLabel}</span>
  </div>
  <div class="pdf-content">
    <div class="summary-box">
      <div class="summary-item"><div class="label">Cargas</div><div class="value">${actualTotalLoads}</div></div>
      <div class="summary-item"><div class="label">Peso Total</div><div class="value">${actualTotalWeightTon} ton</div></div>
      <div class="summary-item"><div class="label">Pre\u00e7o/Ton</div><div class="value">R$ ${formatBR(parseFloat(String(closing.pricePerTon || pricePerTon)))}</div></div>
      <div class="summary-item"><div class="label">Valor Total</div><div class="value blue">R$ ${actualTotalAmount}</div></div>
      <div class="summary-item"><div class="label">Vencimento</div><div class="value">${dueDateFmt}</div></div>
    </div>
    ${weekLoads.length > 0 ? `
    <h3 style="font-size:13px;color:#0d4f2e;margin-bottom:8px;">Detalhamento das Cargas</h3>
    <table>
      <thead><tr>
        <th style="text-align:center">#</th>
        <th>Data</th>
        <th>Nota Fiscal</th>
        <th>Destino</th>
        <th>Placa</th>
        <th>Motorista</th>
        <th style="text-align:right">Volume</th>
        <th style="text-align:right">Peso</th>
        <th style="text-align:right">Tonelada</th>
      </tr></thead>
      <tbody>${loadsRows}</tbody>
    </table>` : ''}
  </div>
  <div class="pdf-footer">
    <div class="pdf-footer-left">
      <img src="${kobayashiB64}" alt="Kobayashi" />
      <div class="pdf-footer-text">
        Desenvolvido por <strong>Kobayashi Desenvolvimento de Sistemas</strong><br/>
        <a href="https://btreeambiental.com">btreeambiental.com</a>
      </div>
    </div>
    <div class="pdf-footer-right">
      <img src="${qrB64}" alt="QR Code" />
      <span>Acesse nosso site</span>
    </div>
  </div>
</div>
</body></html>`;

  await generatePDFFromHtml(html, `fechamento-${clientName.replace(/\s+/g,'-')}-${closing.weekStart || 'semana'}.pdf`);
}

function DevContactButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-1 opacity-80 hover:opacity-100 transition-opacity group"
        title="Desenvolvido por Kobayashi Dev"
      >
        <img
          src={KOBAYASHI_LOGO}
          alt="Desenvolvido por Kobayashi"
          className="h-10 object-contain group-hover:scale-105 transition-transform"
        />
        <span className="text-[10px] text-white/50 group-hover:text-white/80">Desenvolvedor</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-5">
              <img
                src={KOBAYASHI_LOGO}
                alt="Kobayashi Desenvolvimento"
                className="h-12 w-auto object-contain mx-auto mb-3"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <h3 className="font-black text-gray-900 text-lg">Kobayashi Desenvolvimento</h3>
              <p className="text-gray-500 text-sm">Sistemas para seu negócio</p>
            </div>
            <div className="space-y-3">
              <a
                href="https://wa.me/5515997056890"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 hover:bg-green-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">WhatsApp</p>
                  <p className="text-gray-500 text-xs">(15) 99705-6890</p>
                </div>
              </a>
              <a
                href="mailto:fkobayashijunior@gmail.com"
                className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">E-mail</p>
                  <p className="text-gray-500 text-xs">fkobayashijunior@gmail.com</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type ClientSession = {
  clientId: number;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  clientCity: string | null;
};

// ── LOGIN ──
function ClientLogin({ onLogin }: { onLogin: (session: ClientSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.clientPortal.login.useMutation({
    onSuccess: (data) => {
      onLogin(data);
    },
    onError: (err) => {
      toast.error(err.message || "E-mail ou senha incorretos.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0d4f2e] to-[#1a5c3a] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={BTREE_LOGO}
            alt="BTREE Ambiental"
            className="h-16 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-white text-2xl font-black">Área do Cliente</h1>
          <p className="text-green-200 text-sm mt-1">
            Acompanhe suas cargas, replantio e pagamentos
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-gray-900 font-bold text-lg mb-1">Acesse sua conta</h2>
          <p className="text-gray-500 text-sm mb-6">
            Use o e-mail e senha cadastrados pela BTREE Ambiental
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  inputMode="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  autoComplete="email"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-gray-200 focus:border-[#2e7d32] focus:outline-none transition-colors text-gray-900 placeholder-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full h-12 pl-10 pr-10 rounded-xl border-2 border-gray-200 focus:border-[#2e7d32] focus:outline-none transition-colors text-gray-900 placeholder-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending || !email.trim() || !password.trim()}
              className="w-full h-12 rounded-xl font-bold text-white text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%)",
              }}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : (
                "Acessar Portal"
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-6">
            Problemas para acessar?{" "}
            <a
              href="https://wa.me/5544988334679?text=Ol%C3%A1%2C+preciso+de+ajuda+para+acessar+o+portal+do+cliente+BTREE!"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0d4f2e] font-semibold hover:underline"
            >
              Fale com a BTREE
            </a>
          </p>
        </div>

        <p className="text-center text-green-300/60 text-xs mt-4">
          Confiança que floresce, futuro que se constrói.
        </p>
        <div className="flex justify-center mt-4">
          <DevContactButton />
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD DO CLIENTE ──
function ClientDashboard({ session, onLogout }: { session: ClientSession; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"cargas" | "replantio" | "fechamentos" | "documentos" | "adiantamentos">("cargas");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showPaidLoads, setShowPaidLoads] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [newItems, setNewItems] = useState({ cargas: 0, docs: 0, fechamentos: 0, replantios: 0 });

  const { data, isLoading } = trpc.clientPortal.getPortalData.useQuery(
    { clientId: session.clientId, email: session.clientEmail ?? "" },
    { retry: false }
  );
  // advancesData vem do getPortalData (já inclui advances e totalAdvanceBalance)

  // Track last visit and count new items since then
  useEffect(() => {
    if (!data || isLoading) return;
    const storageKey = `btree_last_visit_${session.clientId}`;
    const lastVisitStr = localStorage.getItem(storageKey);
    const lastVisit = lastVisitStr ? new Date(lastVisitStr) : null;

    if (lastVisit) {
      // Count items created after last visit
      const newCargas = data.loads.filter((l: any) => {
        const d = l.createdAt || l.date;
        return d && new Date(d) > lastVisit;
      }).length;
      const newDocs = data.documents.filter((d: any) => d.createdAt && new Date(d.createdAt) > lastVisit).length;
      const newFechamentos = data.weeklyClosings.filter((f: any) => f.createdAt && new Date(f.createdAt) > lastVisit).length;
      const newReplantios = data.replanting.filter((r: any) => r.createdAt && new Date(r.createdAt) > lastVisit).length;

      const total = newCargas + newDocs + newFechamentos + newReplantios;
      if (total > 0) {
        setNewItems({ cargas: newCargas, docs: newDocs, fechamentos: newFechamentos, replantios: newReplantios });
        setShowNotification(true);
      }
    }

    // Update last visit to now
    localStorage.setItem(storageKey, new Date().toISOString());
  }, [data, isLoading, session.clientId]);

  const formatDate = (d: Date | string | null) => {
    if (!d) return "—";
    return safeDate(d as string).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (v: string | number | null) => {
    if (!v && v !== 0) return "—";
    const num = typeof v === 'number' ? v : parseFloat(v);
    if (isNaN(num)) return String(v);
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Calcular valor de uma carga
  const getLoadValue = (load: any) => {
    const weightNet = parseFloat(load.weightNetKg || load.weightOutKg || '0');
    const pricePerTon = parseFloat(data?.client?.pricePerTon || '0');
    if (weightNet > 0 && pricePerTon > 0) {
      return (weightNet / 1000) * pricePerTon;
    }
    return 0;
  };

  const statusColor = (s: string) => {
    if (s === "pago" || s === "entregue") return "bg-green-100 text-green-700";
    if (s === "pendente") return "bg-yellow-100 text-yellow-700";
    if (s === "atrasado") return "bg-red-100 text-red-700";
    if (s === "cancelado") return "bg-gray-100 text-gray-500";
    return "bg-blue-100 text-blue-700";
  };

  const totalPendente = data?.weeklyClosings
    ?.filter((c: any) => c.status === "pendente" || c.status === "atrasado" || c.status === "aberto" || c.status === "fechado")
    .reduce((acc: number, c: any) => {
      const pStart = safeDate(c.weekStart);
      const pEnd = safeDate(c.weekEnd);
      pEnd.setHours(23, 59, 59, 999);
      const pLoads = (data?.loads || []).filter((l: any) => {
        const d = safeDate(l.deliveryDate || l.date);
        return d >= pStart && d <= pEnd;
      });
      const pKg = pLoads.reduce((s: number, l: any) => s + parseFloat(l.weightNetKg || l.weightOutKg || '0'), 0);
      return acc + (pKg / 1000) * parseFloat(c.pricePerTon || data?.client?.pricePerTon || '130');
    }, 0) ?? 0;

  return (
    <div className="min-h-screen bg-[#f0faf4]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#0d4f2e] to-[#1a5c3a] text-white shadow-lg">
        {/* Barra principal - PC: logo centralizada + botões direita | Mobile: logo centralizada + botões abaixo */}
        <div className="px-4 py-3">
          <div className="max-w-5xl mx-auto">
            {/* Layout PC: flex row */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex-1" />
              <img
                src={BTREE_LOGO_NEW}
                alt="BTREE Ambiental"
                className="h-24 w-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = BTREE_LOGO_B64; }}
              />
              <div className="flex-1 flex justify-end items-center gap-2">
                <a href="https://btreeambiental.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-white/10 border border-white/20">
                  <Globe className="h-3.5 w-3.5 shrink-0" /><span>Nosso Site</span>
                </a>
                <a href="https://wa.me/5544988334679?text=Ol%C3%A1%2C+gostaria+de+falar+com+a+BTREE+Ambiental!" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-white/10 border border-white/20">
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" /><span>Contato</span>
                </a>
                <button onClick={onLogout}
                  className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-white/10 border border-white/20">
                  <LogOut className="h-3.5 w-3.5 shrink-0" /><span>Sair</span>
                </button>
              </div>
            </div>
            {/* Layout Mobile: logo centralizada + botões abaixo */}
            <div className="flex sm:hidden flex-col items-center gap-2">
              <img
                src={BTREE_LOGO_NEW}
                alt="BTREE Ambiental"
                className="h-20 w-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = BTREE_LOGO_B64; }}
              />
              <div className="flex items-center gap-2">
                <a href="https://btreeambiental.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-white/10 border border-white/20">
                  <Globe className="h-3.5 w-3.5 shrink-0" /><span>Nosso Site</span>
                </a>
                <a href="https://wa.me/5544988334679?text=Ol%C3%A1%2C+gostaria+de+falar+com+a+BTREE+Ambiental!" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-white/10 border border-white/20">
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" /><span>Contato</span>
                </a>
                <button onClick={onLogout}
                  className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-white/10 border border-white/20">
                  <LogOut className="h-3.5 w-3.5 shrink-0" /><span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Faixa do cliente com resumo */}
        <div className="bg-black/20 px-4 py-3">
          <div className="max-w-5xl mx-auto">
            {/* Nome do cliente */}
            <div className="mb-2">
              <p className="font-bold text-sm leading-none">{session.clientName}</p>
              <p className="text-green-300 text-xs mt-0.5">Área do Cliente</p>
            </div>
            {/* Resumo rápido */}
            {!isLoading && data && (() => {
              const allLoads = data.loads || [];
              const entregues = allLoads.filter((l: any) => l.status === 'entregue');
              const totalEntregues = entregues.length;
              const pricePerTon = parseFloat(data.client?.pricePerTon || '0');
              const valorTotalEntregues = entregues.reduce((sum: number, l: any) => {
                const kg = parseFloat(l.weightNetKg || l.weightOutKg || '0');
                return sum + (kg / 1000) * pricePerTon;
              }, 0);
              // Valor pago = soma dos fechamentos semanais com status 'pago'
              const weeklyClosings = data.weeklyClosings || [];
              const valorPago = weeklyClosings
                .filter((c: any) => c.status === 'pago')
                .reduce((sum: number, c: any) => sum + parseFloat(c.totalAmount || '0'), 0);
              const valorAReceber = Math.max(0, valorTotalEntregues - valorPago);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                    <p className="text-white font-black text-lg leading-none">{totalEntregues}</p>
                    <p className="text-green-200 text-[10px] mt-0.5">Cargas Entregues</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                    <p className="text-white font-black text-sm leading-none">{valorTotalEntregues > 0 ? valorTotalEntregues.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</p>
                    <p className="text-green-200 text-[10px] mt-0.5">Valor Total</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                    <p className="text-green-300 font-black text-sm leading-none">{valorPago > 0 ? valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</p>
                    <p className="text-green-200 text-[10px] mt-0.5">Valor Pago</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                    <p className="text-amber-300 font-black text-sm leading-none">{valorAReceber > 0 ? valorAReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</p>
                    <p className="text-green-200 text-[10px] mt-0.5">A Receber</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Banner de instalação PWA */}
        <InstallBanner />

        {/* Notificação de novos itens */}
        {showNotification && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 relative animate-[slideDown_0.3s_ease-out]">
            <button
              onClick={() => setShowNotification(false)}
              className="absolute top-2 right-2 text-blue-400 hover:text-blue-600 p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </div>
              <div>
                <p className="text-blue-800 font-bold text-sm">Novidades desde sua última visita!</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {newItems.cargas > 0 && (
                    <button onClick={() => { setActiveTab('cargas'); setShowNotification(false); }} className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full hover:bg-blue-200 transition-colors">
                      {newItems.cargas} nova{newItems.cargas > 1 ? 's' : ''} carga{newItems.cargas > 1 ? 's' : ''}
                    </button>
                  )}
                  {newItems.docs > 0 && (
                    <button onClick={() => { setActiveTab('documentos'); setShowNotification(false); }} className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full hover:bg-blue-200 transition-colors">
                      {newItems.docs} novo{newItems.docs > 1 ? 's' : ''} doc{newItems.docs > 1 ? 's' : ''}
                    </button>
                  )}
                  {newItems.fechamentos > 0 && (
                    <button onClick={() => { setActiveTab('fechamentos'); setShowNotification(false); }} className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full hover:bg-blue-200 transition-colors">
                      {newItems.fechamentos} novo{newItems.fechamentos > 1 ? 's' : ''} fechamento{newItems.fechamentos > 1 ? 's' : ''}
                    </button>
                  )}
                  {newItems.replantios > 0 && (
                    <button onClick={() => { setActiveTab('replantio'); setShowNotification(false); }} className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full hover:bg-blue-200 transition-colors">
                      {newItems.replantios} novo{newItems.replantios > 1 ? 's' : ''} replantio{newItems.replantios > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cards de resumo */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-20" />
            ))}
          </div>
        ) : (() => {
          // Calcular valor pago e saldo usando adiantamentos reais
          const allLoads = data?.loads || [];
          // Valor pago = soma dos valores já abatidos nos adiantamentos (totalAmount - balanceRemaining)
          const advances = data?.advances || [];
          const valorPago = advances.reduce((sum: number, a: any) => {
            const total = parseFloat(a.totalAmount || a.amount || '0');
            const saldoAdiantamento = parseFloat(a.balanceRemaining || '0');
            return sum + Math.max(0, total - saldoAdiantamento);
          }, 0);
          // Saldo a receber = saldo disponível nos adiantamentos ativos
          const saldo = data?.totalAdvanceBalance ?? 0;
          const totalValorCargas = valorPago + saldo; // para controle de exibição
          return (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                <Truck className="h-5 w-5 text-[#0d4f2e] mx-auto mb-1" />
                <div className="text-xl font-black text-gray-900">{allLoads.length}</div>
                <div className="text-gray-500 text-xs">Cargas</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                <TreePine className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <div className="text-xl font-black text-gray-900">{data?.replanting.length ?? 0}</div>
                <div className="text-gray-500 text-xs">Replantios</div>
              </div>
              {valorPago > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm text-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <div className="text-base font-black text-green-700">{formatCurrency(valorPago)}</div>
                  <div className="text-green-600 text-xs font-semibold">Valor Abatido</div>
                </div>
              )}
              {totalValorCargas > 0 && (
                <div className={`rounded-2xl p-4 shadow-sm text-center border ${saldo > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <TrendingUp className={`h-5 w-5 mx-auto mb-1 ${saldo > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className={`text-base font-black ${saldo > 0 ? 'text-blue-700' : 'text-gray-500'}`}>{formatCurrency(saldo)}</div>
                  <div className={`text-xs font-semibold ${saldo > 0 ? 'text-blue-600' : 'text-gray-400'}`}>Saldo Adiantamento</div>
                </div>
              )}
            </div>
          );
        })()}



        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
            {[
              { id: "cargas" as const, label: "Cargas", badge: newItems.cargas },
              { id: "fechamentos" as const, label: "Fechamentos", badge: newItems.fechamentos },
              { id: "documentos" as const, label: "Docs", badge: newItems.docs },
              { id: "replantio" as const, label: "Replantio", badge: newItems.replantios },
              // Ocultar aba Adiantamentos para SIMFLOR (sistema de pagamento diferente)
              ...(!session.clientName?.toLowerCase().includes('simflor') ? [{ id: "adiantamentos" as const, label: "Adiantamentos", badge: 0 }] : []),
            ].map(({ id, label, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-3 px-3 text-xs font-semibold transition-colors whitespace-nowrap relative ${
                  activeTab === id
                    ? "text-[#0d4f2e] border-b-2 border-[#0d4f2e] bg-green-50/50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
                {badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {/* ── CARGAS ── */}
                {activeTab === "cargas" && (
                  <div className="space-y-3">
                    {/* Filtro de data */}
                    <div className="flex gap-2 items-center flex-wrap">
                      <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={e => setDateFrom(e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-green-500"
                          placeholder="De"
                        />
                      </div>
                      <span className="text-gray-400 text-xs">até</span>
                      <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
                        <input
                          type="date"
                          value={dateTo}
                          onChange={e => setDateTo(e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-green-500"
                          placeholder="Até"
                        />
                      </div>
                      {(dateFrom || dateTo) && (
                        <button
                          onClick={() => { setDateFrom(""); setDateTo(""); }}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    {/* Toggle cargas pagas */}
                    <div className="flex items-center gap-2 px-1">
                      <button
                        onClick={() => setShowPaidLoads(v => !v)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          showPaidLoads
                            ? 'bg-green-100 border-green-400 text-green-700 font-semibold'
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {showPaidLoads ? '✅' : '⬜'} {showPaidLoads ? 'Mostrando pagas' : 'Ocultar pagas'}
                      </button>
                    </div>
                    {(() => {
                      const allLoadsForCodeSort = data?.loads || [];
                      const codeMapForSort = buildClientCodeMap(allLoadsForCodeSort);
                      const filteredLoads = (data?.loads || []).filter((l: any) => {
                        const d = safeDate(l.deliveryDate || l.date);
                        if (dateFrom && d < new Date(dateFrom + 'T00:00:00')) return false;
                        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
                        // Ocultar cargas pagas quando toggle está desativado
                        if (!showPaidLoads && (l as any).paymentStatus === 'pago') return false;
                        return true;
                      // Ordenar por código sequencial (mais recente primeiro = maior número primeiro)
                      }).sort((a: any, b: any) => {
                        const codeA = parseInt(codeMapForSort.get(a.id) || '0', 10);
                        const codeB = parseInt(codeMapForSort.get(b.id) || '0', 10);
                        return codeB - codeA;
                      });
                      if (filteredLoads.length === 0) return <EmptyState icon={<Truck />} text={dateFrom || dateTo ? "Nenhuma carga no período selecionado." : "Nenhuma carga registrada ainda."} />;
                      const totalValue = filteredLoads.reduce((sum: number, l: any) => sum + getLoadValue(l), 0);
                      const totalWeightNet = filteredLoads.reduce((sum: number, l: any) => sum + parseFloat((l as any).weightNetKg || '0'), 0);
                      return (
                        <>
                          {totalValue > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                              <p className="text-blue-700 text-xs font-semibold uppercase tracking-wide">Valor Total{dateFrom || dateTo ? ' no Período' : ' das Cargas'}</p>
                              <p className="text-blue-900 text-lg font-black">{formatCurrency(totalValue)}</p>
                              <p className="text-blue-600 text-xs">{filteredLoads.length} carga{filteredLoads.length !== 1 ? 's' : ''} · {formatBR(totalWeightNet / 1000)} ton × R$ {data?.client?.pricePerTon || '0'}/ton</p>
                            </div>
                          )}
                          {(() => {
                              const allLoadsForCode = data?.loads || [];
                              const codeMap = codeMapForSort;
                              const clientName = data?.client?.name || '';
                              return filteredLoads.map((load: any) => (
                                <CargoCard
                                  key={load.id}
                                  load={load}
                                  formatDate={formatDate}
                                  statusColor={statusColor}
                                  clientId={session.clientId}
                                  loadValue={getLoadValue(load)}
                                  advanceDeductions={(data?.advanceDeductions || []).filter((d: any) => d.cargoLoadId === load.id)}
                                  clientName={clientName}
                                  codeMap={codeMap}
                                />
                              ));
                            })()}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* ── FECHAMENTOS SEMANAIS ── */}
                {activeTab === "fechamentos" && (
                  <div className="space-y-4">
                    {(() => {
                      const pricePerTon = parseFloat(data?.client?.pricePerTon || '0');
                      const formalClosings = data?.weeklyClosings || [];
                      const allLoads = data?.loads || [];

                      // ── Calcular semana atual e semana passada (Sábado a Sexta) ──
                      const getWeekStart = (d: Date) => {
                        const day = d.getDay();
                        // Week starts on Saturday: if today is Sat (6), start is today; otherwise go back (day+1) days
                        const diff = day >= 6 ? 0 : -(day + 1);
                        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
                        start.setHours(0, 0, 0, 0);
                        return start;
                      };
                      const today = new Date();
                      const thisWeekStart = getWeekStart(today);
                      const lastWeekStart = new Date(thisWeekStart);
                      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
                      const thisWeekEnd = new Date(thisWeekStart);
                      thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
                      thisWeekEnd.setHours(23, 59, 59, 999);
                      const lastWeekEnd = new Date(lastWeekStart);
                      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
                      lastWeekEnd.setHours(23, 59, 59, 999);

                      const thisWeekLoads = allLoads.filter((c: any) => {
                        const d = safeDate(c.deliveryDate || c.date);
                        return d >= thisWeekStart && d <= thisWeekEnd;
                      });
                      const lastWeekLoads = allLoads.filter((c: any) => {
                        const d = safeDate(c.deliveryDate || c.date);
                        return d >= lastWeekStart && d <= lastWeekEnd;
                      });

                      const calcStats = (arr: any[]) => ({
                        count: arr.length,
                        peso: arr.reduce((acc: number, c: any) => acc + parseFloat(c.weightNetKg || c.weightOutKg || '0'), 0),
                        entregues: arr.filter((c: any) => c.status === 'entregue').length,
                      });

                      const thisWeek = { ...calcStats(thisWeekLoads), start: thisWeekStart, end: thisWeekEnd };
                      const lastWeek = { ...calcStats(lastWeekLoads), start: lastWeekStart, end: lastWeekEnd };
                      const thisWeekValue = pricePerTon > 0 ? (thisWeek.peso / 1000) * pricePerTon : 0;
                      const lastWeekValue = pricePerTon > 0 ? (lastWeek.peso / 1000) * pricePerTon : 0;

                      // Check if last week has a formal closing
                      const lastWeekKey = lastWeekStart.toISOString().slice(0, 10);
                      const lastWeekClosing = formalClosings.find((c: any) => {
                        if (!c.weekStart) return false;
                        return safeDate(c.weekStart).toISOString().slice(0, 10) === lastWeekKey;
                      });

                      return (
                        <>
                          {/* ── RESUMO SEMANAL (igual ao admin) ── */}
                          <div className="bg-gradient-to-r from-[#0d4f2e]/5 to-[#1a5c3a]/5 rounded-xl border border-[#0d4f2e]/15 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Calendar className="h-4 w-4 text-[#0d4f2e]" />
                              <h3 className="text-sm font-bold text-[#0d4f2e]">Resumo Semanal</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {/* Semana Atual */}
                              <div className="bg-white rounded-xl p-3 border border-[#0d4f2e]/10 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold text-[#0d4f2e] uppercase tracking-wider">Semana Atual</span>
                                  <span className="text-[9px] text-gray-400">
                                    {thisWeek.start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {thisWeek.end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-xs text-gray-500">Cargas</span>
                                    <span className="text-lg font-black text-[#0d4f2e]">{thisWeek.count}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-xs text-gray-500">Peso</span>
                                    <span className="text-sm font-bold text-emerald-700">{thisWeek.peso > 0 ? formatBR(thisWeek.peso / 1000) : '0'} ton</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-xs text-gray-500">Valor</span>
                                    <span className="text-sm font-black text-blue-700">{thisWeekValue > 0 ? formatCurrency(thisWeekValue) : '—'}</span>
                                  </div>
                                  {thisWeek.entregues > 0 && (
                                    <p className="text-[10px] text-green-600 text-right">{thisWeek.entregues} entregue{thisWeek.entregues > 1 ? 's' : ''}</p>
                                  )}
                                </div>
                              </div>
                              {/* Semana Passada */}
                              <div className="bg-white rounded-xl p-3 border border-gray-200 opacity-90">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Semana Passada</span>
                                  <span className="text-[9px] text-gray-400">
                                    {lastWeek.start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {lastWeek.end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-xs text-gray-500">Cargas</span>
                                    <span className="text-lg font-black text-gray-700">{lastWeek.count}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-xs text-gray-500">Peso</span>
                                    <span className="text-sm font-bold text-emerald-600">{lastWeek.peso > 0 ? formatBR(lastWeek.peso / 1000) : '0'} ton</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-xs text-gray-500">Valor</span>
                                    <span className="text-sm font-black text-blue-600">{lastWeekValue > 0 ? formatCurrency(lastWeekValue) : '—'}</span>
                                  </div>
                                  {lastWeek.entregues > 0 && (
                                    <p className="text-[10px] text-green-600 text-right">{lastWeek.entregues} entregue{lastWeek.entregues > 1 ? 's' : ''}</p>
                                  )}
                                  {lastWeekClosing && (
                                    <p className="text-[10px] text-[#0d4f2e] font-semibold text-right">Fechada</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ── SEMANA ATUAL EM ANDAMENTO ── */}
                          {thisWeek.count > 0 && (
                            <div className="border-2 border-blue-200 bg-blue-50/40 rounded-xl p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-gray-900 text-sm">
                                      Semana {thisWeek.start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {thisWeek.end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-100 text-blue-700 animate-pulse">
                                      Em andamento
                                    </span>
                                  </div>
                                  <div className="text-gray-500 text-xs mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                                    <span>{thisWeek.count} carga{thisWeek.count !== 1 ? 's' : ''}</span>
                                    <span>{formatBR(thisWeek.peso / 1000)} ton</span>
                                    {pricePerTon > 0 && <span>R$ {formatBR(pricePerTon)}/ton</span>}
                                  </div>
                                  <p className="text-[10px] text-blue-600 mt-1.5 italic">Fechamento na sexta-feira</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-black text-blue-600 text-lg">{thisWeekValue > 0 ? formatCurrency(thisWeekValue) : '—'}</p>
                                  <p className="text-[10px] text-blue-400 font-medium">parcial</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── FECHAMENTOS OFICIAIS ── */}
                          {formalClosings.length === 0 && thisWeek.count === 0 && (
                            <EmptyState icon={<DollarSign />} text="Nenhum fechamento semanal registrado ainda." />
                          )}

                          {formalClosings.length > 0 && (
                            <ClosingsList
                              closings={formalClosings}
                              allLoads={allLoads}
                              pricePerTon={pricePerTon}
                              clientName={data?.client?.name || ''}
                              formatCurrency={formatCurrency}
                              codeMap={buildClientCodeMap(allLoads)}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* ── DOCUMENTOS ── */}
                {activeTab === "documentos" && (
                  <div className="space-y-3">
                    {(data?.documents?.length ?? 0) === 0 ? (
                      <EmptyState icon={<Leaf />} text="Nenhum documento cadastrado ainda." />
                    ) : (
                      data?.documents?.map((doc: any) => (
                        <a
                          key={doc.id}
                          href={(doc.fileType?.includes('word') || doc.fileType?.includes('doc') || doc.fileUrl?.includes('.docx') || doc.fileUrl?.includes('.doc'))
                            ? `${doc.fileUrl}${doc.fileUrl?.includes('?') ? '&' : '/'}fl_attachment:${encodeURIComponent(doc.title || 'documento')}`
                            : doc.fileUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                              📄
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">{doc.title}</p>
                              <div className="text-gray-500 text-xs mt-0.5 flex items-center gap-2">
                                <span className="capitalize">{(doc.type || '').replace('_', ' ')}</span>
                                <span>•</span>
                                <span>{doc.createdAt ? safeDate(doc.createdAt).toLocaleDateString('pt-BR') : ''}</span>
                              </div>
                              {doc.notes && <p className="text-gray-400 text-xs mt-0.5 italic truncate">{doc.notes}</p>}
                            </div>
                            <span className="text-blue-600 text-xs font-medium">Abrir ↗</span>
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                )}

                {/* ── ADIANTAMENTOS ── */}
                {activeTab === "adiantamentos" && (
                  <div className="space-y-3">
                    {/* Saldo atual */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-amber-700 text-xs font-semibold uppercase tracking-wide mb-1">Saldo de Adiantamento</p>
                      <p className="text-amber-900 text-2xl font-black">{formatCurrency(data?.totalAdvanceBalance ?? 0)}</p>
                      <p className="text-amber-600 text-xs mt-1">
                        {(data?.totalAdvanceBalance ?? 0) > 0 ? 'Valor disponível para abatimento nas próximas cargas' : 'Adiantamento quitado'}
                      </p>
                    </div>
                    {/* Lista de adiantamentos com abatimentos */}
                    {(data?.advances?.length ?? 0) === 0 ? (
                      <EmptyState icon={<DollarSign />} text="Nenhum adiantamento registrado." />
                    ) : (
                      data?.advances?.map((adv: any) => {
                        const deductions = (data?.advanceDeductions ?? []).filter((d: any) => d.advanceId === adv.id)
                          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        const totalDeducted = parseFloat(adv.amount) - parseFloat(adv.balanceRemaining);
                        return (
                          <div key={adv.id} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">
                                  Adiantamento de {formatCurrency(parseFloat(adv.amount))}
                                </p>
                                <p className="text-gray-500 text-xs mt-0.5">
                                  {adv.date ? safeDate(adv.date).toLocaleDateString('pt-BR') : '—'}
                                </p>
                                {adv.description && <p className="text-gray-400 text-xs mt-1 italic">{adv.description}</p>}
                                {totalDeducted > 0 && (
                                  <p className="text-blue-600 text-xs mt-1">Abatido: {formatCurrency(totalDeducted)}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                  adv.status === 'quitado' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                                }`}>
                                  {adv.status === 'quitado' ? 'Quitado' : 'Ativo'}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">Saldo: {formatCurrency(parseFloat(adv.balanceRemaining))}</p>
                              </div>
                            </div>
                            {/* Histórico de abatimentos */}
                            {deductions.length > 0 && (
                              <div className="mt-3 border-t pt-3">
                                <p className="text-xs font-semibold text-gray-600 mb-2">Histórico de Abatimentos ({deductions.length})</p>
                                <div className="space-y-1.5">
                                  {deductions.map((d: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-green-600 font-bold">✓</span>
                                        <span className="text-gray-600">{d.date ? safeDate(d.date).toLocaleDateString('pt-BR') : '—'}</span>
                                        <span className="text-gray-500 truncate max-w-[120px]">{d.description || `Carga #${d.cargoLoadId || '-'}`}</span>
                                      </div>
                                      <span className="font-semibold text-emerald-700 shrink-0">{formatCurrency(parseFloat(d.amount))}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* ── REPLANTIO ── */}
                {activeTab === "replantio" && (
                  <div className="space-y-3">
                    {(data?.replanting.length ?? 0) === 0 ? (
                      <EmptyState icon={<TreePine />} text="Nenhum replantio registrado ainda." />
                    ) : (
                      data?.replanting.map((r) => (
                        <div key={r.id} className="border border-gray-100 rounded-xl p-4 hover:border-emerald-200 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {r.species || "Eucalipto"}
                                {r.area && ` — ${r.area}`}
                              </p>
                              <div className="text-gray-500 text-xs mt-1 flex items-center gap-3 flex-wrap">
                                <span>{formatDate(r.date)}</span>
                                {r.quantity && <span>{r.quantity.toLocaleString("pt-BR")} mudas</span>}
                                {r.areaHectares && <span>{r.areaHectares} ha</span>}
                              </div>
                              {r.notes && <p className="text-gray-400 text-xs mt-1 italic">{r.notes}</p>}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}


              </>
            )}
          </div>
        </div>
      </div>
      {/* Rodapé com logo do desenvolvedor */}
      <footer className="bg-gradient-to-r from-[#0d4f2e] to-[#1a5c3a] py-4 px-4 mt-4">
        <div className="max-w-2xl mx-auto flex justify-center">
          <DevContactButton />
        </div>
      </footer>
    </div>
  );
}

// Código sequencial de carga: importado de shared/clientCode.ts
// getClientPrefix, buildClientCodeMap, getClientCode

// ── FECHAMENTOS COM EXPANSÃO ──
function ClosingsList({ closings, allLoads, pricePerTon, clientName, formatCurrency, codeMap }: {
  closings: any[];
  allLoads: any[];
  pricePerTon: number;
  clientName: string;
  formatCurrency: (v: string | number | null) => string;
  codeMap?: Map<number, string>;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
        <FileCheck className="h-3.5 w-3.5" />
        Fechamentos Oficiais
      </p>
      {closings.map((closing: any) => {
        const isOverdue = closing.status === 'fechado' && closing.dueDate && safeDate(closing.dueDate) < new Date();
        const cwStart = safeDate(closing.weekStart);
        const cwEnd = safeDate(closing.weekEnd);
        cwEnd.setHours(23, 59, 59, 999);
        const realLoads = allLoads.filter((l: any) => {
          const d = safeDate(l.deliveryDate || l.date);
          return d >= cwStart && d <= cwEnd;
        });
        const realWeightKg = realLoads.reduce((acc: number, l: any) => acc + parseFloat(l.weightNetKg || l.weightOutKg || '0'), 0);
        const realAmount = realWeightKg / 1000 * parseFloat(closing.pricePerTon || String(pricePerTon) || '130');
        const isExpanded = expandedIds.has(closing.id);

        return (
          <div key={`formal-${closing.id}`} className={`border rounded-xl overflow-hidden transition-all ${
            closing.status === 'pago' ? 'border-green-200 bg-green-50/30' :
            isOverdue ? 'border-red-200 bg-red-50/30' :
            'border-yellow-100 bg-yellow-50/30'
          }`}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">
                      Semana {closing.weekStart ? safeDate(closing.weekStart).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''} a {closing.weekEnd ? safeDate(closing.weekEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      closing.status === 'pago' ? 'bg-green-100 text-green-700' :
                      isOverdue ? 'bg-red-100 text-red-700' :
                      closing.status === 'fechado' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {closing.status === 'pago' ? 'Pago' : isOverdue ? 'Atrasado' : closing.status === 'fechado' ? 'Aguardando Pagamento' : closing.status}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{realLoads.length} carga{realLoads.length !== 1 ? 's' : ''}</span>
                    <span>{formatBR(realWeightKg / 1000)} ton</span>
                    {closing.pricePerTon && <span>R$ {closing.pricePerTon}/ton</span>}
                  </div>
                  {closing.status !== 'pago' && closing.dueDate && (
                    <p className={`text-xs mt-1.5 font-medium ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                      Vencimento: {safeDate(closing.dueDate).toLocaleDateString('pt-BR')}
                      {isOverdue && ' (VENCIDO)'}
                    </p>
                  )}
                  {closing.status === 'pago' && closing.paidAt && (
                    <p className="text-xs mt-1.5 text-green-700 font-medium">
                      Pago em: {safeDate(closing.paidAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {closing.status === 'pago' && closing.receiptUrl && (
                    <a
                      href={closing.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors"
                    >
                      <FileCheck className="h-3 w-3" /> Ver Comprovante de Pagamento
                    </a>
                  )}
                  {closing.notes && (
                    <p className="text-xs text-gray-500 mt-1.5 italic">{closing.notes}</p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <p className="font-black text-[#0d4f2e] text-base">{formatCurrency(realAmount)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={() => generateClosingPDF(closing, clientName, allLoads, pricePerTon)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[#0d4f2e]/10 text-[#0d4f2e] rounded-lg text-[10px] font-semibold hover:bg-[#0d4f2e]/20 transition-colors"
                    >
                      <Download className="h-3 w-3" /> PDF
                    </button>
                    {realLoads.length > 0 && (
                      <button
                        onClick={() => toggleExpand(closing.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-semibold hover:bg-gray-200 transition-colors"
                        title={isExpanded ? 'Ocultar cargas' : 'Ver cargas'}
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isExpanded ? 'Ocultar' : 'Cargas'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de cargas expandida */}
            {isExpanded && realLoads.length > 0 && (
              <div className="border-t border-gray-200 bg-white">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Detalhamento das Cargas ({realLoads.length})</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {realLoads.map((l: any, idx: number) => {
                    const date = (l.deliveryDate || l.date) ? safeDate(l.deliveryDate || l.date).toLocaleDateString('pt-BR') : '-';
                    const weightNet = parseFloat(l.weightNetKg || l.weightOutKg || '0');
                    const weightTon = weightNet > 0 ? formatBR(weightNet / 1000, 3) : '-';
                    const clientCode = getClientCode(clientName, l.id, codeMap);
                    const unitPrice = parseFloat(closing.pricePerTon || String(pricePerTon) || '0');
                    const loadAmount = weightNet > 0 && unitPrice > 0 ? weightNet / 1000 * unitPrice : 0;
                    return (
                      <div key={l.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-[#0d4f2e] bg-[#0d4f2e]/10 px-1.5 py-0.5 rounded">{clientCode}</span>
                            <span className="text-xs text-gray-700 font-medium">{date}</span>
                            {l.destination && <span className="text-xs text-gray-500 truncate max-w-[100px]">{l.destination}</span>}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 flex gap-2">
                            {l.vehiclePlate && <span>{l.vehiclePlate}</span>}
                            {l.driverName && <span>{l.driverName}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-emerald-700">{weightTon} ton</p>
                          {loadAmount > 0 && <p className="text-[10px] text-blue-600 font-semibold">{formatCurrency(loadAmount)}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-600">{realLoads.length} cargas · {formatBR(realWeightKg / 1000)} ton</span>
                  <span className="text-xs font-black text-[#0d4f2e]">{formatCurrency(realAmount)}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-10 text-gray-400">
      <div className="w-10 h-10 mx-auto mb-3 opacity-30">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ── CARGO CARD COM TRACKING ──
type CargoLoad = {
  id: number;
  date: Date | string | null;
  destination: string | null;
  status: string;
  volumeM3: string | null;
  woodType: string | null;
  weightKg: string | null;
  driverName: string | null;
  vehiclePlate: string | null;
  invoiceNumber: string | null;
  trackingStatus: string | null;
  trackingNotes: string | null;
  trackingUpdatedAt: Date | string | null;
  weightOutPhotoUrl: string | null;
  weightInPhotoUrl: string | null;
  photosJson: string | null;
  notes: string | null;
};

function CargoCard({ load, formatDate, statusColor, clientId, loadValue, advanceDeductions, clientName, codeMap }: { load: CargoLoad; formatDate: (d: Date | string | null) => string; statusColor: (s: string) => string; clientId: number; loadValue?: number; advanceDeductions?: any[]; clientName?: string; codeMap?: Map<number, string> }) {
  const [expanded, setExpanded] = useState(false);
  const currentStep = TRACKING_STEPS.find(s => s.key === load.trackingStatus);
  const currentIdx = TRACKING_STEPS.findIndex(s => s.key === load.trackingStatus);
  const photos: string[] = load.photosJson ? (() => { try { return JSON.parse(load.photosJson); } catch { return []; } })() : [];

  // Calcular abatido via adiantamento para esta carga
  const totalDeducted = (advanceDeductions || []).reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0);
  const remaining = Math.max(0, (loadValue || 0) - totalDeducted);
  const isPago = (load as any).paymentStatus === 'pago';

  const utils = trpc.useUtils();
  const markAsPaidMutation = trpc.cargoLoads.markAsPaid.useMutation({
    onSuccess: () => { utils.clientPortal.getPortalData.invalidate(); },
  });

  // Buscar fotos de tracking por etapa
  const { data: trackingPhotos } = trpc.cargoLoads.getTrackingPhotosPublic.useQuery(
    { cargoId: load.id, clientId },
    { enabled: expanded }
  );

  // Agrupar fotos por etapa
  const photosByStage = (trackingPhotos ?? []).reduce<Record<string, typeof trackingPhotos>>((acc, p) => {
    if (!acc[p.stage]) acc[p.stage] = [];
    acc[p.stage]!.push(p);
    return acc;
  }, {});

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-[#2e7d32]/30 transition-colors">
      {/* Header da carga */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Código da carga em destaque */}
              {clientName && (
                <span className="font-bold text-gray-900 text-sm font-mono">
                  {getClientCode(clientName, load.id, codeMap)}
                </span>
              )}
              {/* Status de entrega */}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(load.status)}`}>
                {load.status === 'entregue' ? 'entregue' : load.status === 'pendente' ? 'pendente' : load.status}
              </span>
              {currentStep && currentStep.key !== 'finalizado' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">
                  {currentStep.icon} {currentStep.label}
                </span>
              )}
              {isPago ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 border border-green-200">
                  ✅ Pago
                </span>
              ) : totalDeducted > 0 && remaining <= 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 border border-green-200">
                  💰 Pago via Adiantamento
                </span>
              ) : totalDeducted > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  ⚡ Parcialmente Abatido
                </span>
              ) : load.status === 'entregue' ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 border border-red-200">
                  ⏳ Pendente de Pagamento
                </span>
              ) : null}
              {/* Botão Marcar Pago removido do portal do cliente */}
            </div>
            <div className="text-gray-500 text-xs mt-1 flex items-center gap-3 flex-wrap">
              <span>{formatDate((load as any).deliveryDate || load.date)}</span>
              {(load as any).weightNetKg && <span className="flex items-center gap-0.5 font-medium text-emerald-700"><Weight className="h-3 w-3" />{(load as any).weightNetKg} kg (líq.)</span>}
              {load.woodType && <span>{load.woodType}</span>}
              {load.vehiclePlate && <span className="flex items-center gap-0.5"><Truck className="h-3 w-3" />{load.vehiclePlate}</span>}
              {load.destination && <span className="flex items-center gap-0.5 text-gray-400"><MapPin className="h-3 w-3" />{load.destination}</span>}
            </div>
            {(loadValue ?? 0) > 0 && (
              <p className="text-blue-700 text-xs font-bold mt-1">
                R$ {formatBR(loadValue!)}
              </p>
            )}
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-gray-400 hover:text-[#2e7d32] transition-colors p-1"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {/* Timeline de tracking */}
          {load.trackingStatus && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Acompanhamento</p>
              <div className="relative">
                {TRACKING_STEPS.map((step, idx) => {
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isPending = idx > currentIdx;
                  return (
                    <div key={step.key} className="flex items-start gap-3 mb-2 last:mb-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${
                        isDone ? "bg-green-500 text-white" : isCurrent ? "bg-[#2e7d32] text-white ring-4 ring-green-100" : "bg-gray-200 text-gray-400"
                      }`}>
                        {isDone ? "✓" : step.icon}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          isDone ? "text-green-700" : isCurrent ? "text-[#2e7d32] font-bold" : "text-gray-400"
                        }`}>{step.label}</p>
                        {isCurrent && load.trackingNotes && (
                          <p className="text-xs text-gray-500 italic mt-0.5">"{load.trackingNotes}"</p>
                        )}
                        {isCurrent && load.trackingUpdatedAt && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Atualizado em {formatDate(load.trackingUpdatedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fotos de Tracking por Etapa */}
          {Object.keys(photosByStage).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" /> Fotos por Etapa
              </p>
              <div className="space-y-3">
                {TRACKING_STEPS.filter(s => photosByStage[s.key]).map(step => (
                  <div key={step.key}>
                    <p className="text-xs font-medium text-gray-600 mb-1">{step.icon} {step.label}</p>
                    <div className="flex gap-2 flex-wrap">
                      {photosByStage[step.key]!.map((tp: any) => (
                        <div key={tp.id} className="relative group">
                          <img
                            src={tp.photoUrl}
                            alt={`${step.label}`}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(tp.photoUrl, "_blank")}
                          />
                          {tp.notes && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded-b-lg truncate">
                              {tp.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fotos de pesagem */}
          {(load.weightOutPhotoUrl || load.weightInPhotoUrl) && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Fotos de Pesagem</p>
              <div className="flex gap-3">
                {load.weightOutPhotoUrl && (
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Saída</p>
                    <img
                      src={load.weightOutPhotoUrl}
                      alt="Pesagem saída"
                      className="w-full h-28 object-cover rounded-lg border border-gray-200 cursor-pointer"
                      onClick={() => window.open(load.weightOutPhotoUrl!, "_blank")}
                    />
                  </div>
                )}
                {load.weightInPhotoUrl && (
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Chegada</p>
                    <img
                      src={load.weightInPhotoUrl}
                      alt="Pesagem chegada"
                      className="w-full h-28 object-cover rounded-lg border border-gray-200 cursor-pointer"
                      onClick={() => window.open(load.weightInPhotoUrl!, "_blank")}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fotos da carga */}
          {photos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Fotos da Carga ({photos.length})</p>
              <div className="flex gap-2 flex-wrap">
                {photos.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    alt={`Foto ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                    onClick={() => window.open(p, "_blank")}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {load.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Observações</p>
              <p className="text-sm text-amber-900">{load.notes}</p>
            </div>
          )}

          {/* Dados adicionais */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {load.driverName && (
              <div className="bg-white rounded-lg p-2">
                <p className="text-gray-400">Motorista</p>
                <p className="font-medium text-gray-700">{load.driverName}</p>
              </div>
            )}
            {clientName && (
              <div className="bg-white rounded-lg p-2">
                <p className="text-gray-400">Cód. da Carga</p>
                <p className="font-medium text-[#0d4f2e] font-mono font-bold">{getClientCode(clientName, load.id, codeMap)}</p>
              </div>
            )}
            {(load as any).weightOutKg && (
              <div className="bg-white rounded-lg p-2">
                <p className="text-gray-400">Peso Total</p>
                <p className="font-medium text-gray-700">{(load as any).weightOutKg} kg</p>
              </div>
            )}
            {(load as any).weightInKg && (
              <div className="bg-white rounded-lg p-2">
                <p className="text-gray-400">Peso Tara</p>
                <p className="font-medium text-gray-700">{(load as any).weightInKg} kg</p>
              </div>
            )}
            {(load as any).weightNetKg && (
              <div className="bg-white rounded-lg p-2">
                <p className="text-gray-400">Peso Líquido</p>
                <p className="font-medium text-emerald-700 font-bold">{(load as any).weightNetKg} kg</p>
              </div>
            )}
            {(load as any).finalHeightM && (
              <div className="bg-white rounded-lg p-2 col-span-2">
                <p className="text-gray-400">Metragem Final</p>
                <p className="font-medium text-gray-700">
                  {(load as any).finalHeightM} x {(load as any).finalWidthM} x {(load as any).finalLengthM} m
                  {' = '}{formatBR(parseFloat(((load as any).finalHeightM || '0').replace(',','.')) * parseFloat(((load as any).finalWidthM || '0').replace(',','.')) * parseFloat(((load as any).finalLengthM || '0').replace(',','.')), 2)} m³
                </p>
              </div>
            )}
          </div>

          {/* Resumo financeiro: abatido vs. a pagar */}
          {(loadValue || 0) > 0 && (
            <div className={`rounded-xl p-3 border ${
              isPago || (totalDeducted > 0 && remaining <= 0)
                ? 'bg-green-50 border-green-200'
                : totalDeducted > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Resumo Financeiro</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Valor da Carga</p>
                  <p className="text-sm font-bold text-blue-700">R$ {formatBR(loadValue!)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Abatido (Adiant.)</p>
                  <p className={`text-sm font-bold ${totalDeducted > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                    {totalDeducted > 0 ? `R$ ${formatBR(totalDeducted)}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isPago || remaining <= 0 ? 'Status' : 'A Receber'}</p>
                  <p className={`text-sm font-bold ${
                    isPago ? 'text-green-700'
                    : remaining <= 0 && totalDeducted > 0 ? 'text-green-700'
                    : remaining > 0 ? 'text-orange-600'
                    : 'text-green-700'
                  }`}>
                    {isPago ? '✅ Pago' : remaining <= 0 && totalDeducted > 0 ? '💰 Via Adiant.' : remaining > 0 ? `R$ ${formatBR(remaining)}` : '✅ Quitado'}
                  </p>
                </div>
              </div>
              {(advanceDeductions || []).length > 0 && (
                <div className="mt-2 border-t border-gray-200 pt-2">
                  <p className="text-xs text-gray-500 mb-1">Abatimentos registrados:</p>
                  {(advanceDeductions || []).map((d: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-gray-600">
                      <span>{d.description || `Abatimento #${i + 1}`}</span>
                      <span className="font-medium text-green-700">- R$ {formatBR(parseFloat(d.amount || '0'))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documentos compartilhados */}
          {((load as any).invoiceUrl || (load as any).boletoUrl || (load as any).paymentReceiptUrl) && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">📄 Documentos</p>
              <div className="flex flex-wrap gap-2">
                {(load as any).invoiceUrl && (
                  <a
                    href={(load as any).invoiceUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    📋 Nota Fiscal
                  </a>
                )}
                {(load as any).boletoUrl && (
                  <a
                    href={(load as any).boletoUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors border border-orange-200"
                  >
                    🧾 Boleto
                    {(load as any).boletoAmount && <span className="ml-1">R$ {(load as any).boletoAmount}</span>}
                  </a>
                )}
                {(load as any).paymentReceiptUrl && (
                  <a
                    href={(load as any).paymentReceiptUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors border border-green-200"
                  >
                    ✅ Comprovante
                  </a>
                )}
              </div>
              {(load as any).paymentStatus && (
                <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                  (load as any).paymentStatus === 'pago'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {(load as any).paymentStatus === 'pago' ? '✅ Pago' : '⏳ A Pagar'}
                  {(load as any).boletoDueDate && (load as any).paymentStatus !== 'pago' && (
                    <span className="ml-1">· Venc: {safeDate((load as any).boletoDueDate).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──
// Hook to switch manifest based on current area
function useManifestSwitch(manifestPath: string) {
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (link) {
      link.href = manifestPath;
    }
    // Also update apple-touch-icon for iOS
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (appleIcon && manifestPath === '/manifest-cliente.json') {
      appleIcon.href = '/manus-storage/pwa-client-192_b5470888.png';
    }
    return () => {
      // Restore default manifest when leaving
      if (link) link.href = '/manifest.json';
      if (appleIcon) appleIcon.href = '/icon-btree-192.png';
    };
  }, [manifestPath]);
}

export default function ClientPortal() {
  // Switch to client-specific manifest for PWA install
  useManifestSwitch('/manifest-cliente.json');

  const [session, setSession] = useState<ClientSession | null>(() => {
    try {
      const saved = localStorage.getItem("btree_client_session");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const handleLogin = (data: ClientSession) => {
    setSession(data);
    localStorage.setItem("btree_client_session", JSON.stringify(data));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("btree_client_session");
  };

  if (!session) {
    return <ClientLogin onLogin={handleLogin} />;
  }

  return (
    <ClientDashboard
      session={session}
      onLogout={handleLogout}
    />
  );
}
