'use client';

import { Card, Button } from '@heroui/react';
import { Tag, Loader2, CheckCircle2 } from 'lucide-react';
import NextLink from 'next/link';

interface Agent {
  id: number;
  metadata?: { name?: string } | null;
}

interface AgentTagSetupProps {
  untaggedAgents: Agent[];
  isAddingTag: boolean;
  tagAdded: boolean;
  tagError: Error | null;
  tagTxHash?: string;
  onAddTag: (agentId: number) => void;
  onRefetch: () => void;
}

export function AgentTagSetup({
  untaggedAgents,
  isAddingTag,
  tagAdded,
  tagError,
  tagTxHash,
  onAddTag,
  onRefetch,
}: AgentTagSetupProps) {
  const agent = untaggedAgents[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto border border-divider p-8">
        <Tag className="size-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-center mb-2">Add Kokonut Tag</h2>
        <p className="text-default-500 text-center mb-6">
          You have an agent (ID: {agent.id}) but it needs the Kokonut Marketplace tag to create
          services.
        </p>

        <div className="bg-content2 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">What this does:</h3>
          <ul className="text-sm text-default-500 space-y-1 list-disc list-inside">
            <li>Adds &quot;source: kokonut-marketplace&quot; to your agent metadata</li>
            <li>Updates your agent&apos;s tokenURI on the blockchain</li>
            <li>Enables service creation and marketplace participation</li>
          </ul>
        </div>

        {tagError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">Error: {tagError.message}</p>
          </div>
        )}

        {tagAdded ? (
          <div className="text-center">
            <CheckCircle2 className="size-8 text-success mx-auto mb-2" />
            <p className="text-success mb-4">Tag added successfully!</p>
            <Button
              onPress={onRefetch}
              className="bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white font-semibold"
            >
              Continue
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Button
              onPress={() => onAddTag(agent.id)}
              isDisabled={isAddingTag}
              className="w-full bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white font-semibold hover:opacity-90"
            >
              {isAddingTag ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Adding Tag...
                </>
              ) : (
                'Add Kokonut Tag'
              )}
            </Button>

            {tagTxHash && (
              <p className="text-xs text-center text-default-500">
                Transaction: {tagTxHash.slice(0, 20)}...
              </p>
            )}

            <NextLink href="/dashboard/agents">
              <Button variant="ghost" className="w-full">
                View My Agents
              </Button>
            </NextLink>
          </div>
        )}
      </Card>
    </div>
  );
}
