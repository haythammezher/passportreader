import React from 'react';
import { Database, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import type { EnrichedPassport } from '@/lib/passportData';
import Icon from '@/components/ui/AppIcon';


interface RecordsSummaryCardsProps {
  records: EnrichedPassport[];
}

export default function RecordsSummaryCards({ records }: RecordsSummaryCardsProps) {
  const total = records.length;
  const valid = records.filter(r => r.status === 'valid').length;
  const expiring = records.filter(r => r.status === 'expiring').length;
  const expired = records.filter(r => r.status === 'expired').length;

  const cards = [
    {
      id: 'card-total',
      label: 'Total Records',
      value: total,
      icon: Database,
      bgClass: 'bg-card',
      iconClass: 'text-primary bg-primary/10',
      valueClass: 'text-foreground',
      description: 'All passport records in system',
    },
    {
      id: 'card-valid',
      label: 'Valid Passports',
      value: valid,
      icon: CheckCircle,
      bgClass: 'bg-card border-valid/20',
      iconClass: 'text-valid bg-valid/10',
      valueClass: 'text-valid',
      description: 'More than 6 months remaining',
    },
    {
      id: 'card-expiring',
      label: 'Expiring Within 6 Months',
      value: expiring,
      icon: AlertTriangle,
      bgClass: 'bg-expiring/5 border-expiring/25',
      iconClass: 'text-expiring bg-expiring/10',
      valueClass: 'text-expiring',
      description: 'Renewal action recommended',
    },
    {
      id: 'card-expired',
      label: 'Expired',
      value: expired,
      icon: XCircle,
      bgClass: 'bg-expired/5 border-expired/25',
      iconClass: 'text-expired bg-expired/10',
      valueClass: 'text-expired',
      description: 'Immediate action required',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.id} className={`card-surface p-4 ${card.bgClass}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconClass}`}>
                <Icon size={18} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {total > 0 ? `${Math.round((card.value / total) * 100)}%` : '0%'}
              </span>
            </div>
            <p className={`text-3xl font-bold tabular-nums ${card.valueClass}`}>{card.value}</p>
            <p className="text-xs font-semibold text-foreground mt-1">{card.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
}