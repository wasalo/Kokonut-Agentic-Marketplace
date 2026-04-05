/**
 * CSP Report Endpoint
 * Collects Content Security Policy violations without breaking functionality
 * Phase 3: Security - Report Only Mode
 */

interface CSPReport {
  'csp-report'?: {
    'blocked-uri'?: string;
    'violated-directive'?: string;
    'document-uri'?: string;
  };
  type?: string;
}

export async function POST(request: Request) {
  try {
    const report: CSPReport = await request.json();

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[CSP Violation]', JSON.stringify(report, null, 2));
    }

    // In production, you could send to monitoring service
    // Example: Sentry, LogRocket, or custom logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to your monitoring service
      // await sendToMonitoring(report);

      // For now, just log structured data
      console.warn('[CSP Violation]', {
        type: report.type,
        blockedURI: report['csp-report']?.['blocked-uri'],
        violatedDirective: report['csp-report']?.['violated-directive'],
        documentURI: report['csp-report']?.['document-uri'],
        timestamp: new Date().toISOString(),
      });
    }

    // Return 204 No Content
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[CSP Report] Error processing report:', error);
    return new Response(null, { status: 204 });
  }
}
