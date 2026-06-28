import { useEffect, useState } from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useAuth } from '@/contexts/AuthContext';
import wolfLogo from '@/assets/wolftoon-wolf-logo.png';
import { Wrench, Clock, AlertTriangle, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Gear = ({ size = 40, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
  </svg>
);

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const Countdown = ({ target }: { target: string }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [target]);

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      {[
        { label: 'Dias', value: timeLeft.days },
        { label: 'Horas', value: timeLeft.hours },
        { label: 'Min', value: timeLeft.minutes },
        { label: 'Seg', value: timeLeft.seconds },
      ].map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-xl bg-black/40 border border-red-500/30 flex items-center justify-center text-2xl font-black text-red-400 tabular-nums shadow-lg shadow-red-900/20">
            {String(value).padStart(2, '0')}
          </div>
          <span className="text-[10px] text-red-400/60 uppercase tracking-widest mt-1.5">{label}</span>
        </div>
      ))}
    </div>
  );
};

const MaintenancePage = () => {
  const { maintenance } = useMaintenance();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const activatedAt = maintenance.activated_at ? new Date(maintenance.activated_at) : null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a0a0a 0%, #0a0a0f 60%, #000000 100%)' }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-900/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-red-900/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-red-900/15 rounded-full" />
      </div>

      {/* Gear decorations */}
      <div className="absolute top-12 left-12 text-red-900/20 animate-spin" style={{ animationDuration: '20s' }}>
        <Gear size={80} />
      </div>
      <div className="absolute bottom-12 right-12 text-red-900/15 animate-spin" style={{ animationDuration: '30s', animationDirection: 'reverse' }}>
        <Gear size={120} />
      </div>
      <div className="absolute top-1/3 right-8 text-red-900/10 animate-spin" style={{ animationDuration: '15s' }}>
        <Gear size={50} />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-lg w-full mx-auto px-6 text-center">
        {/* Logo with red glow */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 bg-red-600/30 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="absolute inset-0 bg-red-500/10 blur-xl rounded-full scale-125" />
          <img
            src={wolfLogo}
            alt="Wolftoon"
            className="relative w-24 h-24 rounded-2xl object-cover ring-2 ring-red-500/40 shadow-2xl shadow-red-900/50"
          />
        </div>

        {/* Brand */}
        <div className="text-xs font-bold tracking-[0.3em] text-red-400/60 uppercase mb-2">
          Wolftoon · Reino dos Lobos
        </div>

        {/* Wrench icon */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-red-400 animate-bounce" />
          <span className="text-red-400 font-bold text-sm tracking-widest uppercase">Modo Manutenção</span>
          <Wrench className="w-5 h-5 text-red-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
          Site em
          <span className="block bg-gradient-to-r from-red-400 via-red-300 to-red-500 bg-clip-text text-transparent">
            Manutenção
          </span>
        </h1>

        {/* Description */}
        <p className="text-gray-400 text-sm leading-relaxed mb-2">
          Estamos realizando melhorias para oferecer uma experiência ainda melhor.
        </p>
        <p className="text-gray-500 text-sm font-medium">
          Por favor, volte em breve.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
          <div className="w-1 h-1 rounded-full bg-red-500/50" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
        </div>

        {/* Reason box */}
        <div className="bg-black/40 border border-red-900/30 rounded-xl p-4 text-left mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-red-400/70 mb-1">Motivo</div>
              <p className="text-gray-300 text-sm">{maintenance.reason}</p>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        {activatedAt && (
          <div className="flex items-center justify-center gap-1.5 text-gray-600 text-xs mb-1">
            <Clock className="w-3 h-3" />
            <span>
              Iniciada em{' '}
              {activatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              {' às '}
              {activatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Countdown */}
        {maintenance.show_countdown && maintenance.estimated_return && (
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-red-400/60 mb-1">
              Previsão de retorno
            </div>
            <Countdown target={maintenance.estimated_return} />
          </div>
        )}

        {/* Admin override */}
        {isAdmin && (
          <div className="mt-8 p-4 border border-amber-500/20 rounded-xl bg-amber-900/10">
            <div className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">
              ⚡ Acesso Administrativo
            </div>
            <p className="text-amber-400/70 text-xs mb-3">
              Você está vendo esta página porque o site está em manutenção. Como administrador, pode acessar o painel.
            </p>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs"
              onClick={() => navigate('/admin?tab=settings')}
            >
              <Power className="w-3.5 h-3.5 mr-1.5" />
              Ir para o Painel
            </Button>
          </div>
        )}
      </div>

      {/* Bottom copyright */}
      <div className="absolute bottom-4 text-gray-800 text-xs">
        © {new Date().getFullYear()} Wolftoon · Todos os direitos reservados
      </div>
    </div>
  );
};

export default MaintenancePage;
