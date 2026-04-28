import { useState, useEffect } from "react";
import { getLoginUrl } from "@/const";

// CDN Assets
const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
const IMG_PARCEIRO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/btree-parceiro-eucalipto_db7a6c0f.jpeg";
const IMG_JAPAO_PR = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/btree-japao-parana_34091df8.jpeg";
const IMG_PAGAMENTO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/btree-pagamento-justo_bbae9d14.jpeg";
const IMG_MUDA = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/btree-muda-futuro_03d08384.jpeg";
const IMG_CULTIVANDO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/btree-cultivando-futuro_02818d3f.jpeg";

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── NAVBAR ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white shadow-md" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <button onClick={() => scrollTo("inicio")} className="flex items-center">
              <img
                src={BTREE_LOGO}
                alt="BTREE Ambiental"
                className={`h-10 md:h-12 w-auto object-contain transition-all duration-300 ${
                  scrolled ? "" : "brightness-0 invert"
                }`}
              />
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: "Início", id: "inicio" },
                { label: "Sobre", id: "sobre" },
                { label: "Serviços", id: "servicos" },
                { label: "Nossa História", id: "historia" },
                { label: "Contato", id: "contato" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`text-sm font-medium transition-colors hover:text-[#2e7d32] ${
                    scrolled ? "text-gray-700" : "text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <a
                href="/client-portal"
                className="border border-[#2e7d32] text-[#2e7d32] px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#2e7d32]/10 transition-colors"
              >
                Área do Cliente
              </a>
              <a
                href={getLoginUrl()}
                className="bg-[#2e7d32] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#1b5e20] transition-colors"
              >
                Área do Colaborador →
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              className={`md:hidden p-2 ${scrolled ? "text-gray-700" : "text-white"}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white shadow-lg rounded-b-xl pb-4">
              {[
                { label: "Início", id: "inicio" },
                { label: "Sobre", id: "sobre" },
                { label: "Serviços", id: "servicos" },
                { label: "Nossa História", id: "historia" },
                { label: "Contato", id: "contato" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="block w-full text-left px-6 py-3 text-gray-700 hover:bg-gray-50 font-medium"
                >
                  {item.label}
                </button>
              ))}
              <div className="px-6 pt-2 flex flex-col gap-2">
                <a
                  href="/client-portal"
                  className="block border border-[#2e7d32] text-[#2e7d32] px-5 py-3 rounded-full text-sm font-semibold text-center hover:bg-[#2e7d32]/10 transition-colors"
                >
                  Área do Cliente
                </a>
                <a
                  href={getLoginUrl()}
                  className="block bg-[#2e7d32] text-white px-5 py-3 rounded-full text-sm font-semibold text-center hover:bg-[#1b5e20] transition-colors"
                >
                  Área do Colaborador →
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        id="inicio"
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 40%, #388e3c 70%, #43a047 100%)",
        }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full mb-6 border border-white/30">
                <span>🌿</span>
                <span>BIOMASSA · TRATAMENTO · REFLORESTAMENTO · ESTRUTURA · EUCALIPTO</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
                Quer um{" "}
                <span className="text-[#a5d6a7]">parceiro completo</span>{" "}
                para o seu eucalipto?
              </h1>
              <p className="text-lg text-green-100 mb-8 max-w-lg leading-relaxed">
                A BTREE Ambiental é a sua solução. Oferecemos um ciclo completo de serviços com a garantia de quem entende do assunto — da muda ao corte, com respeito ao produtor e à natureza.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => scrollTo("contato")}
                  className="bg-white text-[#2e7d32] px-8 py-4 rounded-full font-bold text-base hover:bg-green-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Solicitar Orçamento →
                </button>
                <button
                  onClick={() => scrollTo("servicos")}
                  className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-base hover:bg-white/10 transition-all"
                >
                  Nossos Serviços
                </button>
              </div>
            </div>

            {/* Right: stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "PR", label: "Astorga, Paraná", suffix: "" },
                { value: "100%", label: "Venda garantida", suffix: "" },
                { value: "100%", label: "Sustentável", suffix: "" },
                { value: "Japão", label: "Origem do grupo", suffix: "" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                  <div className="text-green-200 text-sm font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L60 66.7C120 53.3 240 26.7 360 20C480 13.3 600 26.7 720 33.3C840 40 960 40 1080 36.7C1200 33.3 1320 26.7 1380 23.3L1440 20V80H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── SERVIÇOS ── */}
      <section id="servicos" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#2e7d32] font-semibold text-sm uppercase tracking-widest">O que oferecemos</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 mb-4">
              Ciclo Completo para o Seu Eucalipto
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Da venda de mudas ao reflorestamento, cuidamos de cada etapa com profissionalismo e respeito ao meio ambiente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "🌱",
                title: "Venda de Mudas",
                desc: "Qualidade genética e alto desempenho. Mudas de eucalipto selecionadas para máxima produtividade.",
                color: "from-green-50 to-emerald-50",
                border: "border-green-200",
              },
              {
                icon: "💰",
                title: "Compra e Venda de Eucalipto",
                desc: "Transparência e pagamento justo. Sua confiança é nosso maior valor — pagamentos pontuais e honestos.",
                color: "from-amber-50 to-yellow-50",
                border: "border-amber-200",
              },
              {
                icon: "🪚",
                title: "Corte Profissional",
                desc: "Eficiência e segurança no manejo. Equipe capacitada com parceria SENAR-PR para operação de motosserras.",
                color: "from-blue-50 to-sky-50",
                border: "border-blue-200",
              },
              {
                icon: "🌳",
                title: "Reflorestamento Sustentável",
                desc: "Renovamos o solo e o futuro da produção. Restauração de áreas degradadas com planejamento técnico.",
                color: "from-teal-50 to-green-50",
                border: "border-teal-200",
              },
            ].map((s) => (
              <div
                key={s.title}
                className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-1`}
              >
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOBRE / HISTÓRIA ── */}
      <section id="sobre" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <img
                src={IMG_JAPAO_PR}
                alt="Do Japão para o Paraná"
                className="rounded-3xl shadow-2xl w-full object-cover"
                style={{ maxHeight: "500px" }}
              />
              <div className="absolute -bottom-6 -right-6 bg-[#2e7d32] text-white rounded-2xl p-5 shadow-xl">
                <div className="text-2xl font-black">Astorga-PR</div>
                <div className="text-green-200 text-sm">Sede no Paraná</div>
              </div>
            </div>
            <div>
              <span className="text-[#2e7d32] font-semibold text-sm uppercase tracking-widest">Nossa história</span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 mb-6">
                Do Japão para o Paraná: inovação que transforma florestas
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                A BTREE Ambiental nasce sob os cuidados e investimentos de um grupo japonês com anos de estudos no setor florestal. Sediada em <strong>Astorga, Paraná</strong>, colocamos a mão na massa com o compromisso de profissionalizar e inovar no setor de biomassa e madeira estrutural de eucalipto.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Nossa missão é construir relações duradouras e de confiança com os agricultores, impulsionando o desenvolvimento sustentável da região com ética, respeito e responsabilidade ambiental. Já temos <strong>venda garantida</strong> e estamos cada vez mais fortalecidos, conquistando a confiança de novos parceiros comerciais.
              </p>
              <div className="flex items-center gap-3 bg-[#2e7d32]/10 rounded-xl p-4 border border-[#2e7d32]/20">
                <span className="text-2xl">✨</span>
                <p className="text-[#1b5e20] font-semibold italic">
                  "Btree Ambiental: Confiança que floresce, futuro que se constrói."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NOSSA HISTÓRIA (galeria Instagram) ── */}
      <section id="historia" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#2e7d32] font-semibold text-sm uppercase tracking-widest">Nossos valores</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 mb-4">
              Cultivando um Futuro Sustentável Desde a Raiz
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="relative rounded-3xl overflow-hidden group cursor-pointer shadow-lg">
              <img
                src={IMG_PAGAMENTO}
                alt="Pagamento justo, parceria verdadeira"
                className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-white font-black text-xl mb-1">Pagamento justo,<br />parceria verdadeira.</h3>
                <p className="text-green-300 text-sm">Respeito e transparência em cada negócio</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="relative rounded-3xl overflow-hidden group cursor-pointer shadow-lg">
              <img
                src={IMG_MUDA}
                alt="De uma muda, nasce um futuro verde"
                className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-white font-black text-xl mb-1">De uma muda,<br />nasce um futuro verde.</h3>
                <p className="text-green-300 text-sm">Cuidamos de cada etapa com respeito à natureza</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="relative rounded-3xl overflow-hidden group cursor-pointer shadow-lg">
              <img
                src={IMG_CULTIVANDO}
                alt="Cultivando um Futuro Sustentável"
                className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-white font-black text-xl mb-1">Cultivando um Futuro<br />Sustentável Desde a Raiz.</h3>
                <p className="text-green-300 text-sm">Da venda de mudas ao corte e reflorestamento</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── POR QUE BTREE ── */}
      <section className="py-24 bg-[#1b5e20] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-green-300 font-semibold text-sm uppercase tracking-widest">Por que escolher a BTREE?</span>
              <h2 className="text-3xl md:text-4xl font-black text-white mt-2 mb-6">
                Cansado de promessas vazias e pagamentos que não chegam?
              </h2>
              <p className="text-green-200 leading-relaxed mb-6">
                Na BTREE Ambiental, sua confiança é nosso maior valor. Somos a empresa que veio do Japão para Astorga com um compromisso: <strong className="text-white">transparência, honestidade e pagamentos justos e pontuais</strong> pelo seu eucalipto.
              </p>
              <div className="space-y-4">
                {[
                  "Parceria sólida e profissional que valoriza seu trabalho",
                  "Inovação e profissionalismo de nível mundial na silvicultura",
                  "Expertise japonesa aliada à dedicação local",
                  "Tecnologia, respeito e um futuro próspero para todos",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#a5d6a7] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-[#1b5e20]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-green-100">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img
                src={IMG_PARCEIRO}
                alt="Parceiro completo para seu eucalipto"
                className="rounded-3xl shadow-2xl w-full object-cover"
                style={{ maxHeight: "520px" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTATO ── */}
      <section id="contato" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#2e7d32] font-semibold text-sm uppercase tracking-widest">Fale conosco</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 mb-4">
              Vamos crescer juntos?
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Entre em contato e descubra como a BTREE Ambiental pode ser o parceiro que você precisa para o seu eucalipto.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <a
              href="tel:+5544988334679"
              className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all group"
            >
              <div className="w-14 h-14 bg-[#2e7d32]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#2e7d32]/20 transition-colors">
                <svg className="w-7 h-7 text-[#2e7d32]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Telefone</h3>
              <p className="text-[#2e7d32] font-semibold">(44) 98833-4679</p>
              <p className="text-gray-500 text-sm mt-1">Fábio Jundy Kobayashi</p>
            </a>

            <a
              href="https://www.instagram.com/btree_ambiental"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all group"
            >
              <div className="w-14 h-14 bg-[#2e7d32]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#2e7d32]/20 transition-colors">
                <svg className="w-7 h-7 text-[#2e7d32]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Instagram</h3>
              <p className="text-[#2e7d32] font-semibold">@btree_ambiental</p>
              <p className="text-gray-500 text-sm mt-1">Siga nossas novidades</p>
            </a>

            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-14 h-14 bg-[#2e7d32]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-[#2e7d32]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Endereço</h3>
              <p className="text-gray-700 font-medium text-sm">Av. Pres. Epitácio, 278</p>
              <p className="text-gray-500 text-sm">1º Andar - Centro</p>
              <p className="text-[#2e7d32] font-semibold text-sm mt-1">Astorga - PR</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 bg-gradient-to-r from-[#1b5e20] to-[#2e7d32]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Pronto para fazer parte do futuro verde do Brasil?
          </h2>
          <p className="text-green-200 text-lg mb-8">
            Junte-se aos produtores que já confiam na BTREE Ambiental.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => scrollTo("contato")}
              className="bg-white text-[#2e7d32] px-8 py-4 rounded-full font-bold text-base hover:bg-green-50 transition-all shadow-lg"
            >
              Falar com a BTREE →
            </button>
            <a
              href="https://www.instagram.com/btree_ambiental"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-base hover:bg-white/10 transition-all"
            >
              Ver no Instagram
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src={BTREE_LOGO}
                alt="BTREE Ambiental"
                className="h-12 w-auto object-contain brightness-0 invert opacity-90"
              />
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                Av. Pres. Epitácio, 278 — 1º Andar — Centro | Astorga - PR
              </p>
              <p className="text-gray-500 text-xs mt-1">
                BIOMASSA · TRATAMENTO · REFLORESTAMENTO · ESTRUTURA · EUCALIPTO
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/btree_ambiental"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="/client-portal"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Área do Cliente
              </a>
              <a
                href={getLoginUrl()}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Área do Colaborador
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-gray-600 text-xs">
              © 2025 BTREE Ambiental. Todos os direitos reservados. | Astorga, Paraná, Brasil
            </p>
            <p className="text-gray-700 text-xs">
              Desenvolvido por{" "}
              <a
                href="https://wa.me/5544988334679?text=Ol%C3%A1%2C+vi+o+site+da+BTREE+Ambiental+e+gostaria+de+saber+mais+sobre+sistemas+e+sites!"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-[#2e7d32] transition-colors font-medium"
              >
                Fernando Kobayashi Jr. — Sistemas &amp; Web
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
