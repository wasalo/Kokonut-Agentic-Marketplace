import { useState, useEffect } from 'react';
import { testnetReadiness, TestnetReadinessReport } from '@/lib/ows/testnet-readiness';

export function useTestnetReadiness() {
  const [report, setReport] = useState<TestnetReadinessReport | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      setIsChecking(true);
      const result = await testnetReadiness.runChecks();
      setReport(result);
      setIsChecking(false);
    };

    check();
  }, []);

  return {
    report,
    isChecking,
    isReady: report?.overall === 'ready',
    isPartial: report?.overall === 'partial',
    isNotReady: report?.overall === 'not_ready',
  };
}