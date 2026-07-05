import { execSync } from 'child_process';
import * as path from 'path';

const CLI_PATH = path.resolve(__dirname, '../cli.ts');

function runCli(args: string, envVars: Record<string, string> = {}): string {
  const env = { ...process.env, ...envVars, NODE_ENV: 'test' };
  return execSync(`npx tsx ${CLI_PATH} ${args}`, { env, encoding: 'utf-8' });
}

describe('CLI', () => {
  describe('help', () => {
    it('should display help message', () => {
      const output = runCli('--help');
      expect(output).toContain('Kokonut CLI');
      expect(output).toContain('Commands:');
    });

    it('should display version', () => {
      const output = runCli('--version');
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('network commands', () => {
    it('should show network info', () => {
      const output = runCli('network info');
      expect(output).toContain('Sepolia');
      expect(output).toContain('11155111');
    });
  });

  describe('contract read commands', () => {
    it('should get agent count', () => {
      const output = runCli('agent-count');
      expect(output).toBeDefined();
    });

    it('should get active service count', () => {
      const output = runCli('active-service-count');
      expect(output).toBeDefined();
    });

    it('should get job count', () => {
      const output = runCli('job-count');
      expect(output).toBeDefined();
    });
  });

  describe('V9 multi-token commands', () => {
    it('should get max budget USD', () => {
      const output = runCli('max-budget-usd');
      expect(output).toBeDefined();
    });

    it('should get min budget USD', () => {
      const output = runCli('min-budget-usd');
      expect(output).toBeDefined();
    });

    it('should get price oracle address', () => {
      const output = runCli('get-price-oracle');
      expect(output).toContain('0x');
    });

    it('should check if paused', () => {
      const output = runCli('is-paused');
      expect(output).toMatch(/true|false/i);
    });
  });
});
