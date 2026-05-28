'use client';

import { Card } from '@heroui/react';
import { DollarSign } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { ProviderServiceActions } from '@/components/marketplace/ProviderServiceActions';
import { ServiceBondStatus } from '@/components/marketplace/ServiceBondStatus';
import type { Service } from '@/lib/hooks/useServices';
import { formatAmount, getTokenByAddress } from '@/lib/tokenUtils';

interface ProviderServiceCardProps {
  service: Service;
  onRefetch: () => void;
}

export function ProviderServiceCard({ service, onRefetch }: ProviderServiceCardProps) {
  const token = getTokenByAddress(service.paymentToken);
  const formattedPrice = formatAmount(service.price, token, {
    includeSymbol: true,
    minFractionDigits: token.symbol === 'USDC' ? 2 : 0,
    maxFractionDigits: token.symbol === 'USDC' ? 2 : 6,
  });

  return (
    <Card className="border border-divider p-4 hover:border-[#009F4D]/30 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{service.name}</h3>
            <StatusBadge status={service.isActive ? 'active' : 'inactive'} size="sm" />
          </div>
          {service.description && (
            <p className="text-sm text-default-500 mt-1.5 line-clamp-2">{service.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1 text-sm">
              <DollarSign className="size-4 text-success" />
              <span className="font-medium">{formattedPrice}</span>
            </div>
            <span className="text-xs text-default-400">Agent #{service.agentId.toString()}</span>
            <ServiceBondStatus serviceId={service.id} isActive={service.isActive} />
          </div>
        </div>
        <ProviderServiceActions service={service} onRefetch={onRefetch} />
      </div>
    </Card>
  );
}
