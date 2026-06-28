import { useState } from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Wrench, Power, Clock, Calendar, AlertTriangle, CheckCircle2,
  ShieldCheck, Timer, FileText
} from 'lucide-react';

const PRESET_REASONS = [
  'Atualização do sistema.',
  'Correção de bugs críticos.',
  'Migração de servidor.',
  'Implementação de novas funcionalidades.',
  'Manutenção de emergência.',
  'Otimização de banco de dados.',
];

const MaintenanceSettings = () => {
  const { maintenance, updateMaintenance } = useMaintenance();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [localReason, setLocalReason] = useState(maintenance.reason);
  const [localShowCountdown, setLocalShowCountdown] = useState(maintenance.show_countdown);
  const [localEstimatedReturn, setLocalEstimatedReturn] = useState(
    maintenance.estimated_return
      ? new Date(maintenance.estimated_return).toISOString().slice(0, 16)
      : ''
  );

  const handleToggle = async (enabled: boolean) => {
    setSaving(true);
    try {
      await updateMaintenance({
        enabled,
        activated_at: enabled ? new Date().toISOString() : null,
        reason: localReason,
        show_countdown: localShowCountdown,
        estimated_return: localEstimatedReturn ? new Date(localEstimatedReturn).toISOString() : null,
      });
      toast({
        title: enabled ? '🚨 Modo Manutenção Ativado' : '✅ Site Online',
        description: enabled
          ? 'O site está em manutenção. Usuários não conseguem acessar.'
          : 'O site voltou ao normal.',
        variant: enabled ? 'destructive' : 'default',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await updateMaintenance({
        reason: localReason,
        show_countdown: localShowCountdown,
        estimated_return: localEstimatedReturn ? new Date(localEstimatedReturn).toISOString() : null,
      });
      toast({ title: 'Configurações salvas', description: 'As configurações de manutenção foram atualizadas.' });
    } finally {
      setSaving(false);
    }
  };

  const activatedAt = maintenance.activated_at ? new Date(maintenance.activated_at) : null;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
        maintenance.enabled
          ? 'border-red-500/30 bg-gradient-to-br from-red-950/40 to-card'
          : 'border-green-500/20 bg-gradient-to-br from-green-950/20 to-card'
      }`}>
        <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl ${
          maintenance.enabled ? 'bg-red-600/15' : 'bg-green-600/10'
        }`} />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              maintenance.enabled ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'
            }`}>
              {maintenance.enabled ? <Wrench className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-bold text-base">
                  {maintenance.enabled ? 'Site em Manutenção' : 'Site Online'}
                </h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  maintenance.enabled
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {maintenance.enabled ? '● INATIVO' : '● ATIVO'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {maintenance.enabled
                  ? 'Usuários comuns não conseguem acessar o site.'
                  : 'O site está funcionando normalmente para todos os usuários.'}
              </p>
              {activatedAt && maintenance.enabled && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400/70">
                  <Clock className="h-3 w-3" />
                  Ativado em {activatedAt.toLocaleDateString('pt-BR')} às {activatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {maintenance.enabled ? 'Desativar' : 'Ativar'}
            </span>
            <Switch
              checked={maintenance.enabled}
              onCheckedChange={handleToggle}
              disabled={saving}
              className="data-[state=checked]:bg-red-600"
            />
          </div>
        </div>

        {maintenance.enabled && (
          <div className="relative mt-4 pt-4 border-t border-red-900/30">
            <div className="flex items-center gap-2 text-red-400/80 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                Administradores continuam com acesso normal ao site durante a manutenção.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="rounded-2xl border border-border/40 bg-card/80 p-5 space-y-5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">Configurações da Manutenção</h3>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Motivo da Manutenção
          </Label>
          <Textarea
            value={localReason}
            onChange={(e) => setLocalReason(e.target.value)}
            placeholder="Descreva o motivo da manutenção..."
            className="resize-none rounded-xl text-sm min-h-[80px]"
          />
          {/* Presets */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PRESET_REASONS.map((preset) => (
              <button
                key={preset}
                onClick={() => setLocalReason(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  localReason === preset
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Countdown toggle */}
        <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/20 border border-border/30">
          <div className="flex items-start gap-3">
            <Timer className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium">Mostrar previsão de retorno</div>
              <div className="text-xs text-muted-foreground">Exibe uma contagem regressiva na página de manutenção</div>
            </div>
          </div>
          <Switch
            checked={localShowCountdown}
            onCheckedChange={setLocalShowCountdown}
          />
        </div>

        {/* Estimated return datetime */}
        {localShowCountdown && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Data e hora de retorno estimada
            </Label>
            <Input
              type="datetime-local"
              value={localEstimatedReturn}
              onChange={(e) => setLocalEstimatedReturn(e.target.value)}
              className="rounded-xl text-sm"
            />
          </div>
        )}

        {/* Admin bypass notice */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-900/10 border border-blue-900/20">
          <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-400/80">
            <strong className="text-blue-400">Quem mantém acesso durante a manutenção:</strong>
            <span className="block mt-0.5">Administradores · Proprietários · Moderadores autorizados</span>
          </div>
        </div>

        <Button
          onClick={handleSaveConfig}
          disabled={saving}
          className="rounded-xl w-full sm:w-auto"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {/* Quick action */}
      <div className="flex gap-3">
        <Button
          variant={maintenance.enabled ? 'outline' : 'destructive'}
          size="sm"
          disabled={saving}
          className="rounded-xl flex-1"
          onClick={() => handleToggle(!maintenance.enabled)}
        >
          <Power className="h-3.5 w-3.5 mr-1.5" />
          {maintenance.enabled ? '✅ Colocar Site Online' : '🚨 Ativar Manutenção Agora'}
        </Button>
      </div>
    </div>
  );
};

export default MaintenanceSettings;
