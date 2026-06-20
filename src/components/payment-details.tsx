import { Building2, CreditCard, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentAccount = {
  accountNumber?: string;
  bank?: string;
  accountType?: string;
  holder?: string;
  dni?: string;
};

type PaymentDetailsProps = {
  paymentInfo: string;
  variant?: 'default' | 'inverse';
  className?: string;
};

const paymentFieldPattern =
  /(n(?:ú|u)mero\s+de\s+cuenta|banco|tipo(?:\s+de)?\s+cuenta|titular|dni)\s*:\s*/gi;

const normalizeFieldName = (label: string): keyof PaymentAccount => {
  const normalized = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (normalized.startsWith('numero')) return 'accountNumber';
  if (normalized === 'banco') return 'bank';
  if (normalized.startsWith('tipo')) return 'accountType';
  if (normalized === 'titular') return 'holder';
  return 'dni';
};

const parsePaymentAccounts = (paymentInfo: string): PaymentAccount[] => {
  const matches = Array.from(paymentInfo.matchAll(paymentFieldPattern));
  if (!matches.length) return [];

  const accounts: PaymentAccount[] = [];
  let currentAccount: PaymentAccount = {};

  matches.forEach((match, index) => {
    const field = normalizeFieldName(match[1]);
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd = matches[index + 1]?.index ?? paymentInfo.length;
    const value = paymentInfo
      .slice(valueStart, valueEnd)
      .trim()
      .replace(/^[,;.\s]+|[,;.\s]+$/g, '');

    if (field === 'accountNumber' && Object.keys(currentAccount).length > 0) {
      accounts.push(currentAccount);
      currentAccount = {};
    }

    if (value) {
      currentAccount[field] = value;
    }
  });

  if (Object.keys(currentAccount).length > 0) {
    accounts.push(currentAccount);
  }

  return accounts;
};

export const PaymentDetails = ({
  paymentInfo,
  variant = 'default',
  className,
}: PaymentDetailsProps) => {
  const accounts = parsePaymentAccounts(paymentInfo);
  const isInverse = variant === 'inverse';

  if (!accounts.length) {
    return (
      <div
        className={cn(
          'whitespace-pre-line rounded-xl border p-4 leading-relaxed',
          isInverse ? 'border-white/15 bg-white/10 text-white/90' : 'bg-muted/40 text-muted-foreground',
          className
        )}
      >
        {paymentInfo}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {accounts.map((account, index) => (
        <div
          key={`${account.accountNumber ?? account.bank ?? 'cuenta'}-${index}`}
          className={cn(
            'rounded-xl border p-4',
            isInverse ? 'border-white/15 bg-white/10' : 'border-border bg-muted/30'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                isInverse ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary'
              )}
            >
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className={cn('text-xs font-medium uppercase tracking-wide', isInverse ? 'text-white/65' : 'text-muted-foreground')}>
                Cuenta {index + 1}
              </p>
              <p className="truncate text-base font-semibold">{account.bank || 'Cuenta bancaria'}</p>
            </div>
          </div>

          {account.accountNumber && (
            <div className={cn('mt-4 rounded-lg px-3 py-2.5', isInverse ? 'bg-black/15' : 'bg-background')}>
              <div className={cn('flex items-center gap-2 text-xs', isInverse ? 'text-white/65' : 'text-muted-foreground')}>
                <CreditCard className="h-3.5 w-3.5" />
                Número de cuenta
              </div>
              <p className="mt-1 break-all font-mono text-base font-semibold tracking-wide">
                {account.accountNumber}
              </p>
            </div>
          )}

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {account.accountType && (
              <div>
                <dt className={isInverse ? 'text-white/65' : 'text-muted-foreground'}>Tipo de cuenta</dt>
                <dd className="font-medium">{account.accountType}</dd>
              </div>
            )}
            {account.dni && (
              <div>
                <dt className={isInverse ? 'text-white/65' : 'text-muted-foreground'}>DNI</dt>
                <dd className="font-medium">{account.dni}</dd>
              </div>
            )}
            {account.holder && (
              <div className="sm:col-span-2">
                <dt className={cn('flex items-center gap-1.5', isInverse ? 'text-white/65' : 'text-muted-foreground')}>
                  <UserRound className="h-3.5 w-3.5" />
                  Titular
                </dt>
                <dd className="font-medium leading-relaxed">{account.holder}</dd>
              </div>
            )}
          </dl>
        </div>
      ))}
    </div>
  );
};
