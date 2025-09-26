import { Progress } from "@/components/ui/progress";

interface CapacityIndicatorProps {
  current: number;
  max: number;
  className?: string;
}

export function CapacityIndicator({ current, max, className = '' }: CapacityIndicatorProps) {
  const percentage = (current / max) * 100;
  const remaining = max - current;
  
  const getStatusColor = () => {
    if (percentage >= 100) return 'text-destructive';
    if (percentage >= 80) return 'text-warm-accent';
    return 'text-lake-green';
  };

  const getProgressColor = () => {
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 80) return 'bg-warm-accent';
    return 'bg-lake-green';
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