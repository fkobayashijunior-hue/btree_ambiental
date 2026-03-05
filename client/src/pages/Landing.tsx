import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  TreePine, Leaf, MapPin, Phone, Mail, ChevronRight, ArrowRight,
  Shield, Award, BarChart3, Users, Globe, CheckCircle2, Menu, X
} from "lucide-react";

const LOGO_URL = "https://files.manuscdn.com/files/btree-logo.png";

const services = [
  {
    icon: TreePine,
    title: "Reflorestamento",
    desc: "Plantio e recuperação de áreas degradadas com espécies nativas da Mata Atlântica e Cerrado.",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: Leaf,
    title: "Manejo Florestal",
    desc: "Gestão sustentável de florestas plantadas e nativas, com rastreabilidade completa.",
    color: "bg-green-50 text-green-700",
  },
  {
    icon: Shield,
    title: "Compensação Ambiental",
    desc: "Projetos de compensação de carbono e cumprimento de passivos ambientais.",
    color: "bg-teal-50 text-teal-700",
  },
  {
    icon: BarChart3,
    title: "Consultoria Ambiental",
    desc: "Licenciamento, laudos técnicos e assessoria para regularização ambiental.",
    color: "bg-lime-50 text-lime-700",
  },
];

const stats = [
  { value: "2.500+", label: "Hectares reflorestados" },
  { value: "15+", label: "Anos de experiência" },
  { value: "120+", label: "Projetos realizados" },
  { value: "98%", label: "Índice de satisfação" },
];

const differentials = [
  "Equipe técnica especializada com engenheiros florestais e agrônomos",
  "Rastreabilidade completa do plantio à colheita",
  "Uso de tecnologia para monitoramento em campo",
  "Parceria com viveiros certificados de mudas nativas",
  "Relatórios periódicos e transparência total",
  "Atendimento em todo o território nacional",
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white shadow-md" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <TreePine className="h-5 w-5 text-white" />
              </div>
              <span className={`font-bold text-lg ${scrolled ? "text-emerald-800" : "text-white"}`}>
                BTREE Ambiental
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {["Início", "Serviços", "Sobre", "Contato"].map(item => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace("í", "i")}`}
                  className={`text-sm font-medium transition-colors hover:text-emerald-400 ${scrolled ? "text-gray-700" : "text-white/90"}`}
                >
                  {item}
                </a>
              ))}
              <Link href="/login">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                  Área do Colaborador <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className={`md:hidden p-2 rounded-lg ${scrolled ? "text-gray-700" : "text-white"}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            {["Início", "Serviços", "Sobre", "Contato"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="block text-gray-700 font-medium py-2" onClick={() => setMenuOpen(false)}>
                {item}
              </a>
            ))}
            <Link href="/login">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Área do Colaborador
              </Button>
            </Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900" />
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-500/50 mb-6 text-sm">
              🌱 Reflorestamento com Tecnologia
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Recuperando o<br />
              <span className="text-emerald-300">futuro verde</span><br />
              do Brasil
            </h1>
            <p className="text-emerald-100 text-lg mb-8 leading-relaxed max-w-lg">
              Somos especialistas em reflorestamento e manejo florestal sustentável.
              Transformamos áreas degradadas em florestas produtivas com rastreabilidade completa.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-white text-emerald-800 hover:bg-emerald-50 font-semibold gap-2">
                Solicitar Orçamento <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 bg-transparent">
                Conheça nossos projetos
              </Button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-white text-center">
                <p className="text-3xl font-bold text-emerald-300">{s.value}</p>
                <p className="text-sm text-emerald-100 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 80L1440 20C1200 70 960 0 720 30C480 60 240 10 0 40L0 80Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="bg-emerald-100 text-emerald-700 mb-4">Nossos Serviços</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Soluções completas em<br />
              <span className="text-emerald-600">gestão ambiental</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Da consultoria ao campo, oferecemos serviços integrados para empresas e produtores rurais que buscam regularidade ambiental e sustentabilidade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s, i) => (
              <Card key={i} className="border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre / Diferenciais */}
      <section id="sobre" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="bg-emerald-100 text-emerald-700 mb-4">Por que a BTREE?</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Tecnologia e expertise<br />
                <span className="text-emerald-600">a serviço da natureza</span>
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                A BTREE Ambiental combina mais de 15 anos de experiência em campo com tecnologia de ponta para oferecer serviços de reflorestamento com alta eficiência, rastreabilidade e transparência. Nosso sistema de gestão garante que cada árvore plantada seja monitorada do viveiro até a floresta.
              </p>
              <div className="space-y-3">
                {differentials.map((d, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600 text-sm">{d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual placeholder */}
            <div className="relative">
              <div className="bg-gradient-to-br from-emerald-600 to-green-800 rounded-3xl p-8 text-white">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: TreePine, label: "Espécies nativas", value: "200+" },
                    { icon: Globe, label: "Estados atendidos", value: "12" },
                    { icon: Users, label: "Colaboradores", value: "80+" },
                    { icon: Award, label: "Certificações", value: "FSC®" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/10 rounded-2xl p-4 text-center">
                      <item.icon className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
                      <p className="text-2xl font-bold">{item.value}</p>
                      <p className="text-xs text-emerald-200">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-white/10 rounded-2xl">
                  <p className="text-emerald-200 text-sm italic">
                    "Nossa missão é recuperar ecossistemas degradados, gerando valor ambiental, social e econômico para as próximas gerações."
                  </p>
                  <p className="text-white font-semibold text-sm mt-2">— Diretoria BTREE Ambiental</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-emerald-700">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para iniciar seu projeto de reflorestamento?
          </h2>
          <p className="text-emerald-100 text-lg mb-8">
            Entre em contato com nossa equipe técnica e receba uma proposta personalizada.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="bg-white text-emerald-800 hover:bg-emerald-50 font-semibold gap-2">
              <Phone className="h-4 w-4" /> Falar com especialista
            </Button>
            <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 bg-transparent gap-2">
              <Mail className="h-4 w-4" /> Enviar mensagem
            </Button>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Phone, label: "Telefone", value: "(00) 00000-0000", sub: "Seg–Sex, 8h–18h" },
              { icon: Mail, label: "E-mail", value: "contato@btreeambiental.com", sub: "Respondemos em até 24h" },
              { icon: MapPin, label: "Localização", value: "Estado de São Paulo, Brasil", sub: "Atendimento nacional" },
            ].map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <c.icon className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{c.label}</p>
                  <p className="text-gray-600">{c.value}</p>
                  <p className="text-gray-400 text-sm">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <TreePine className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold">BTREE Ambiental</span>
          </div>
          <p className="text-emerald-300 text-sm text-center">
            © {new Date().getFullYear()} BTREE Ambiental. Todos os direitos reservados.
          </p>
          <Link href="/login">
            <Button size="sm" variant="outline" className="border-emerald-500 text-emerald-300 hover:bg-emerald-800 bg-transparent">
              Área do Colaborador
            </Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}
