"use client";

import { useAdminRegistry } from '@/lib/hooks';
import { useAgentReputation } from '@/lib/hooks/useAgentReputation';
import { Address } from '@/components/Address';

export default function FeaturedAgentsPage() {
  const { featuredAgents, isLoadingFeaturedAgents } = useAdminRegistry();
  
  if (isLoadingFeaturedAgents) {
    return <div>Loading featured agents...</div>;
  }
  
  if (!featuredAgents || featuredAgents.length === 0) {
    return <div>No featured agents yet.</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Featured Agents</h1>
      <div className="grid gap-6">
        {featuredAgents.map((agentId) => (
          <AgentCard key={agentId} agentId={Number(agentId)} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ agentId }: { agentId: number }) {
  const { score, isLoading, decayFactor, daysElapsed } = useAgentReputation(`0x${agentId.toString(16)}`, 1000);
  
  if (isLoading) {
    return <div className="border rounded-lg p-6 bg-white shadow-sm">Loading...</div>;
  }
  
  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold">Agent {agentId}</h3>
          <p className="text-gray-600"><Address address={`0x${agentId.toString(16)}` as `0x${string}`} truncate /></p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-blue-600">{score}</span>
          <span className="text-sm text-gray-500"> /1000</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Reputation Score:</span>
          <span className="font-medium">{score}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Decay Factor:</span>
          <span className="font-medium">{decayFactor.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Days Elapsed:</span>
          <span className="font-medium">{daysElapsed}</span>
        </div>
      </div>
    </div>
  );
}