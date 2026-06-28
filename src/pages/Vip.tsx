import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check, Star, Zap, Shield, Crown, Gift, Clock,
  ChevronDown, ChevronUp, Sparkles, Rocket, Eye, Lock,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRedeemVipCode } from "@/hooks/useVipCode";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const plans = [
  { duration: '7 dias',   price: 'R$ 2,90',   perDay: 'R$ 0,41/dia',       popular: false, badge: null },
  { duration: '1 mês',    price: 'R$ 5,90',   perDay: 'R$ 0,20/dia',       popular: true,  badge: 'MAIS POPULAR' },
  { duration: '3 meses',  price: 'R$ 14,90',  perDay: 'R$ 0,17/dia',       popular: false, badge: null },
  { duration: '6 meses',  price: 'R$ 24,90',  perDay: 'R$ 0,14/dia',       popular: false, badge: 'MELHOR CUSTO' },
  { duration: '1 ano',    price: 'R$ 44,90',  perDay: 'R$ 0,12/dia',       popular: false, badge: null },
  { duration: 'Vitalício',price: 'R$ 149,90', perDay: 'pague uma vez',      popular: false, badge: 'MELHOR VALOR' },
];

const benefits = [
  { icon: Shield,   title: "Sem Anúncios",        desc: "Leitura limpa, sem pop-ups nem banners",        color: "text-sky-400",     bg: "bg-sky-500/10 border-sky-500/20" },
  { icon: Zap,      title: "Acesso Antecipado",   desc: "Capítulos novos 24h antes de todos",            color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  { icon: Crown,    title: "Badge VIP",            desc: "Destaque exclusivo no perfil e comentários",    color: "text-primary",     bg: "bg-primary/10 border-primary/20" },
  { icon: Eye,      title: "Leitor Sem Limites",   desc: "Sem restrições de velocidade de leitura",       color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
  { icon: Lock,     title: "Conteúdo Exclusivo",   desc: "Capítulos e obras só para membros VIP",         color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20" },
  { icon: Rocket,   title: "Suporte Prioritário",  desc: "Atendimento rápido via Discord e e-mail",       color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
];

const comparison = [
  { feature: 'Acesso a todos os títulos',   free: true,  vip: true  },
  { feature: 'Leitura ilimitada',           free: true,  vip: true  },
  { feature: 'Comentários',                 free: true,  vip: true  },
  { feature: 'Sem anúncios',                free: false, vip: true  },
  { feature: 'Acesso antecipado (+24h)',    free: false, vip: true  },
  { feature: 'Conteúdo exclusivo VIP',      free: false, vip: true  },
  { feature: 'Badge VIP no perfil',         free: false, vip: true  },
  { feature: 'Leitor sem limitações',       free: false, vip: true  },
  { feature: 'Suporte prioritário',         free: false, vip: true  },
];

const faqs = [
  { q: "Posso cancelar a qualquer momento?",      a: "Sim! Sem taxas ou fidelidade. Cancele quando quiser." },
  { q: "Como funciona o acesso antecipado?",      a: "VIPs leem capítulos novos 24h antes do público geral." },
  { q: "Como resgatar um código VIP?",            a: "Insira o código no campo abaixo enquanto estiver logado." },
  { q: "Quais são as formas de pagamento?",       a: "Cartão de crédito, débito e PIX." },
  { q: "O VIP vitalício pode expirar?",           a: "Não. É permanente — pague uma vez, use para sempre." },
  { q: "Posso ter VIP em múltiplos dispositivos?",a: "Sim, sua conta VIP funciona em qualquer dispositivo." },
];

const Vip = () => {
  const { user, isVip } = useAuth();
  const { toast } = useToast();
  const redeemCode = useRedeemVipCode();
  const [code, setCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectTo = searchParams.get('redirect');

  useEffect(() => {
    if (isVip && redirectTo && redirectTo.startsWith('/')) {
      navigate(redirectTo, { replace: true });
    }
  }, [isVip, redirectTo, navigate]);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await redeemCode.mutateAsync({ code: code.trim() });
      toast({ title: 'Código resgatado!', description: 'Você agora é VIP! Aproveite.' });
      setCode('');
    } catch (error: any) {
      toast({ title: 'Erro ao resgatar', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/15 blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 pt-16 pb-12 max-w-5xl relative">
          {/* VIP Active Banner */}
          {user && isVip && (
            <div className="mb-10 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-emerald-500/10 p-6 text-center">
              <Crown className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h2 className="text-xl font-black mb-1">Você já é VIP! 🎉</h2>
              <p className="text-sm text-muted-foreground mb-4">Aproveite todos os benefícios exclusivos.</p>
              <Button asChild variant="outline" className="rounded-xl" size="sm">
                <Link to="/vip/status">Ver Status VIP →</Link>
              </Button>
            </div>
          )}

          {/* Crown + title */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[20px] bg-gradient-to-br from-primary via-primary/80 to-emerald-500 mb-5 shadow-2xl shadow-primary/40">
              <Crown className="h-10 w-10 text-primary-foreground" />
            </div>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Wolftoon VIP</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Leia sem limites
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto text-base md:text-lg">
              Acesso antecipado, zero anúncios e conteúdo exclusivo. Apoie o projeto e leve sua experiência ao máximo.
            </p>
          </div>

          {/* ── Benefits grid ───────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-16">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className={cn("rounded-2xl p-4 border", b.bg)}>
                  <div className={cn("mb-3", b.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-black text-sm mb-1">{b.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>

          {/* ── Plans ───────────────────────────────────────── */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-black mb-2">Escolha seu Plano</h2>
              <p className="text-sm text-muted-foreground">Quanto mais longo, menor o custo diário</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {plans.map((plan, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedPlan(i)}
                  className={cn(
                    "relative rounded-2xl p-4 md:p-5 text-left transition-all duration-200 border-2",
                    selectedPlan === i
                      ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/15"
                      : "border-border/30 bg-card/60 hover:border-border/60 hover:bg-card/80",
                  )}
                >
                  {plan.badge && (
                    <span className={cn(
                      "absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black px-3 py-0.5 rounded-full whitespace-nowrap",
                      plan.popular
                        ? "bg-primary text-primary-foreground"
                        : "bg-emerald-500 text-white",
                    )}>
                      {plan.badge}
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold">{plan.duration}</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-black mb-0.5 tabular-nums",
                    selectedPlan === i ? "text-primary" : "text-foreground",
                  )}>
                    {plan.price}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{plan.perDay}</p>

                  {selectedPlan === i && (
                    <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Button
                size="lg"
                className="rounded-xl px-10 h-12 shadow-lg shadow-primary/25 font-black text-base"
              >
                <Crown className="h-4 w-4 mr-2" />
                Assinar {plans[selectedPlan].duration} — {plans[selectedPlan].price}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Pagamento seguro · Cancele quando quiser
              </p>
            </div>
          </div>

          {/* ── Redeem Code ─────────────────────────────────── */}
          {user && !isVip && (
            <div className="mb-16 max-w-md mx-auto">
              <div className="rounded-2xl border border-border/40 bg-card/60 p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Gift className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Resgatar Código VIP</h3>
                    <p className="text-[11px] text-muted-foreground">Ganhou um código? Insira abaixo</p>
                  </div>
                </div>
                <form onSubmit={handleRedeemCode} className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="WOLF-XXXX-XXXX"
                    className="uppercase rounded-xl bg-background/50 font-mono tracking-widest text-sm flex-1"
                    maxLength={20}
                  />
                  <Button
                    type="submit"
                    className="rounded-xl shrink-0"
                    disabled={redeemCode.isPending || !code.trim()}
                  >
                    {redeemCode.isPending ? '...' : 'Resgatar'}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* ── Free vs VIP comparison ──────────────────────── */}
          <div className="mb-16">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-8">Grátis vs VIP</h2>
            <div className="rounded-2xl border border-border/30 overflow-hidden bg-card/40">
              {/* Header row */}
              <div className="grid grid-cols-3 border-b border-border/30">
                <div className="p-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Recurso</div>
                <div className="p-3 text-center text-sm font-bold border-l border-border/20">Grátis</div>
                <div className="p-3 text-center text-sm font-black text-primary border-l border-border/20 bg-primary/5">
                  <Crown className="h-3.5 w-3.5 inline mr-1" />VIP
                </div>
              </div>
              {comparison.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 border-b border-border/15 last:border-0 hover:bg-muted/10 transition-colors"
                >
                  <div className="p-3 text-xs text-muted-foreground">{row.feature}</div>
                  <div className="p-3 border-l border-border/15 flex items-center justify-center">
                    {row.free
                      ? <Check className="h-4 w-4 text-emerald-400" />
                      : <span className="h-4 w-4 flex items-center justify-center text-muted-foreground/40 text-lg leading-none">—</span>
                    }
                  </div>
                  <div className="p-3 border-l border-border/15 bg-primary/5 flex items-center justify-center">
                    {row.vip
                      ? <Check className="h-4 w-4 text-primary" />
                      : <span className="text-muted-foreground/40 text-lg leading-none">—</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── FAQ ─────────────────────────────────────────── */}
          <div className="max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-8">Dúvidas Frequentes</h2>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/30 bg-card/40 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left group"
                  >
                    <span className="font-semibold text-sm pr-4 group-hover:text-primary transition-colors">
                      {faq.q}
                    </span>
                    {openFaq === i
                      ? <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
                      : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border/20 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom CTA ──────────────────────────────────── */}
          {!isVip && (
            <div className="text-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-emerald-500/5 p-10">
              <Crown className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl md:text-3xl font-black mb-2">Pronto para ser VIP?</h2>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
                Junte-se aos leitores que apoiam o Wolftoon e aproveitam tudo sem limites.
              </p>
              <Button
                size="lg"
                className="rounded-xl px-10 h-12 shadow-lg shadow-primary/25 font-black"
                onClick={() => document.querySelector('[data-plans]')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Quero ser VIP
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Vip;
