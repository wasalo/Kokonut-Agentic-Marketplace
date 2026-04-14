'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useXMTP, type XMTPConversation as Conv, type XMTPMessage } from '@/lib/hooks/useXMTP';
import { formatAddress } from '@/lib/utils';

export default function MessagesPage() {
  const { address, isConnected } = useAccount();
  const {
    client,
    isLoading: xmtpLoading,
    error,
    isReady,
    getConversations,
    sendMessage,
  } = useXMTP();
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conv | null>(null);

  useEffect(() => {
    async function loadConvs() {
      if (!isReady || !client) {
        setConversations([]);
        return;
      }

      setLoadingConversations(true);
      try {
        const convs = await getConversations();
        setConversations(convs);
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setLoadingConversations(false);
      }
    }

    loadConvs();
  }, [isReady, client, getConversations]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Messages</h1>
          <p className="text-default-500 mb-6">
            Connect your wallet to view your XMTP conversations
          </p>
          <a
            href="https://xmtp.org/inbox"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Open XMTP Inbox →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Messages</h1>

      {xmtpLoading ? (
        <div className="text-center py-8">
          <p className="text-default-500">Connecting to XMTP...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
          <p className="text-sm text-default-500 mt-2">
            <a href="https://xmtp.org/inbox" target="_blank" className="underline">
              Use XMTP Inbox →
            </a>
          </p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-8">
          <p>No conversations yet</p>
          <p className="text-sm text-default-500 mt-2">
            Start a conversation from an agent or service profile
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="md:col-span-1 bg-content border border-divider rounded-xl overflow-hidden">
            <div className="divide-y divide-default-100">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left hover:bg-default-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-default-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                      {conv.peerAddress.charAt(2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {conv.peerName || formatAddress(conv.peerAddress)}
                      </div>
                      {conv.lastMessage && (
                        <div className="text-sm text-default-500 truncate">{conv.lastMessage}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-2 bg-content border border-divider rounded-xl overflow-hidden">
            {selectedConversation ? (
              <ChatWindow
                conversation={selectedConversation}
                xmtpClient={client!}
                sendMessage={sendMessage}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-default-500">
                <div className="text-center">
                  <p className="text-lg mb-2">Select a conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatWindow({
  conversation,
  xmtpClient,
  sendMessage,
}: {
  conversation: Conv;
  xmtpClient: any;
  sendMessage: (peer: string, content: string) => Promise<boolean>;
}) {
  const { address } = useAccount();
  const [messages, setMessages] = useState<XMTPMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function loadMessages() {
      if (!xmtpClient || !conversation.peerAddress) return;

      setLoadingMessages(true);
      try {
        const conv = await xmtpClient.conversations.getConversation(conversation.peerAddress);
        if (conv) {
          const msgs = await conv.messages({ limit: 50 });
          setMessages(
            msgs.map((m: any) => ({
              id: m.id,
              content: m.content as string,
              senderAddress: m.senderInboxId,
              sentAt: m.sentAt,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
  }, [xmtpClient, conversation.peerAddress]);

  const handleSend = async () => {
    if (!newMessage.trim() || !address) return;

    setIsSending(true);
    try {
      const success = await sendMessage(conversation.peerAddress, newMessage);
      if (success) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-divider">
        <h3 className="font-semibold">
          {conversation.peerName || formatAddress(conversation.peerAddress)}
        </h3>
        <p className="text-sm text-default-500">{formatAddress(conversation.peerAddress)}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingMessages ? (
          <div className="text-center text-default-500 py-8">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-default-500 py-8">
            <p>No messages yet</p>
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.senderAddress === address ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.senderAddress === address ? 'bg-purple-500 text-white' : 'bg-default-100'
                }`}
              >
                <p>{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${msg.senderAddress === address ? 'text-purple-200' : 'text-default-400'}`}
                >
                  {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString() : ''}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-divider">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-default-50 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
