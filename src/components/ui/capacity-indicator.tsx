import { Progress } from "@/components/ui/progress";

interface CapacityIndicatorProps {
  current: number;
  max?: number | null;
  className?: string;
}

export function CapacityIndicator({ current, max = null, className = '' }: CapacityIndicatorProps) {
  if (typeof max !== 'number' || !Number.isFinite(max) || max <= 0) {
    const participantsLabel = current === 1 ? 'participante' : 'participantes';
    const progressValue = current > 0 ? 100 : 0;

    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Inscritos</span>
          <span className="font-semibold text-lake-green">{current} {participantsLabel}</span>
        </div>
        <Progress value={progressValue} className="h-2" />
        <div className="text-center text-sm font-medium text-lake-green">
          Cupos ilimitados disponibles
        </div>
      </div>
    );
  }

  const percentage = Math.min((current / max) * 100, 100);
  const remaining = Math.max(max - current, 0);

  const getStatusColor = () => {
    if (percentage >= 100) return 'text-destructive';
    if (percentage >= 80) return 'text-warm-accent';
    return 'text-lake-green';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Inscritos</span>
        <span className={`font-semibold ${getStatusColor()}`}>
          {current} / {max}
        </span>
      </div>
      <Progress
        value={percentage}
        className="h-2"
      />
      <div className={`text-center text-sm font-medium ${getStatusColor()}`}>
        {remaining > 0 ? (
          <>Quedan <span className="font-bold">{remaining}</span> cupos</>
        ) : (
          <span className="font-bold">¡Cupo agotado!</span>
        )}
      </div>
    </div>
  );
}
