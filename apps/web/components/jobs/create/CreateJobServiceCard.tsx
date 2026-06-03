'use client';

import { Card } from '@heroui/react';
import { Address } from '@/components/Address';
import { Token, formatAmount } from '@/lib/tokenUtils';
import { card } from '@/lib/design-system';

interface Service {
  name: string;
  description: string;
  provider: `0x${string}`;
  price: bigint;
  paymentToken: `0x${string}`;
}

interface CreateJobServiceCardProps {
  service: Service;
  serviceToken: Token;
  formattedServicePrice: string;
}

export function CreateJobServiceCard({
  service,
  serviceToken,
  formattedServicePrice,
}: CreateJobServiceCardProps) {
  return (
    <Card className={card('padded', 'mb-6 p-5')}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{service.name}</h3>
          <p className="text-sm text-default-500 mt-0.5">{service.description}</p>
          <p className="text-xs text-default-400 mt-1">
            Provider: <Address address={service.provider} truncate />
          </p>
          <p className="text-xs text-default-400 mt-1">
            Job Budget:{' '}
            <span className="text-success font-medium">{formattedServicePrice}</span>
            {service.price === 0n && (
              <span className="text-danger ml-2">(Warning: Service price is 0)</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-success">
            {formatAmount(service.price, serviceToken, {
              minFractionDigits: serviceToken.symbol === 'USDC' ? 2 : 0,
              maxFractionDigits: serviceToken.symbol === 'USDC' ? 2 : 6,
            })}
          </p>
          <p className="text-xs text-default-400">{serviceToken.symbol}</p>
        </div>
      </div>
    </Card>
  );
}
