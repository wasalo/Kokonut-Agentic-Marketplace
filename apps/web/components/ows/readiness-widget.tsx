'use client';

import { useState, useEffect } from 'react';
import { Card } from '@heroui/react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Shield,
  Wifi,
  Database,
  Lock,
} from 'lucide-react';
import { testnetReadiness, TestnetReadinessReport } from '@/lib/ows/testnet-readiness';

interface OWSReadinessWidgetProps {
  compact?: boolean;
}

export function OWSReadinessWidget({ compact = false }: OWSReadinessWidgetProps) {
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

  const getStatusIcon = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-danger" />;
    }
  };

  const getStatusColor = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'fail':
        return 'text-danger';
    }
  };

  const getOverallIcon = () => {
    if (!report) return <RefreshCw className="w-5 h-5 animate-spin" />;
    switch (report.overall) {
      case 'ready':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'not_ready':
        return <XCircle className="w-5 h-5 text-danger" />;
    }
  };

  const getOverallLabel = () => {
    if (!report) return 'Checking...';
    switch (report.overall) {
      case 'ready':
        return 'Ready';
      case 'partial':
        return 'Partial';
      case 'not_ready':
        return 'Not Ready';
    }
  };

  const getCheckIcon = (name: string) => {
    const icons: Record<string, React.ReactNode> = {
      'Chain Support': <Wifi className="w-4 h-4" />,
      'RPC Configuration': <Wifi className="w-4 h-4" />,
      'Storage Availability': <Database className="w-4 h-4" />,
      'Encryption Support': <Lock className="w-4 h-4" />,
      'Policy Engine': <Shield className="w-4 h-4" />,
    };
    return icons[name] || <CheckCircle2 className="w-4 h-4" />;
  };

  if (isChecking) {
    return (
      <Card className="p-4 border border-divider">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-default-400" />
          <span className="text-default-500">Checking OWS status...</span>
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card
        className={`p-3 border ${report?.overall === 'ready' ? 'border-success/30 bg-success/5' : report?.overall === 'partial' ? 'border-warning/30 bg-warning/5' : 'border-danger/30 bg-danger/5'}`}
      >
        <div className="flex items-center gap-2">
          {getOverallIcon()}
          <span className="font-medium">OWS: {getOverallLabel()}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border border-divider">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">OWS Readiness</h3>
        </div>
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded-full ${
            report?.overall === 'ready'
              ? 'bg-success/10 text-success'
              : report?.overall === 'partial'
                ? 'bg-warning/10 text-warning'
                : 'bg-danger/10 text-danger'
          }`}
        >
          {getOverallIcon()}
          <span className="text-sm font-medium">{getOverallLabel()}</span>
        </div>
      </div>

      <div className="space-y-2">
        {report?.checks.map((check, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 rounded-lg bg-content2/50"
          >
            <div className="flex items-center gap-2">
              <span className={getStatusColor(check.status)}>{getCheckIcon(check.name)}</span>
              <span className="text-sm">{check.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(check.status)}
              <span className={`text-xs ${getStatusColor(check.status)}`}>{check.message}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-divider text-xs text-default-400">
        Last checked: {new Date(report?.timestamp || 0).toLocaleTimeString()}
      </div>
    </Card>
  );
}
