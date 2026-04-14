import { NextRequest, NextResponse } from 'next/server';
import { getLiveFeedMessages, postLiveFeedMessage, isAdminAddress } from '@/lib/xmtp/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const messages = await getLiveFeedMessages(20);

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      sender: {
        address: msg.sender.address,
        name: msg.sender.name,
        verified: msg.sender.verified,
        role: msg.sender.role,
      },
      content: msg.content,
      timestamp:
        msg.timestamp instanceof Date ? msg.timestamp.toISOString() : String(msg.timestamp),
      pinned: msg.pinned,
      replies: msg.replies,
    }));

    return NextResponse.json({
      messages: formattedMessages,
      count: formattedMessages.length,
    });
  } catch (error) {
    console.error('Live feed API error:', error);

    return NextResponse.json({
      messages: [],
      count: 0,
      error: 'Failed to fetch live feed',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, sender: senderInput, pinned = false } = body;

    if (!content || !senderInput?.address) {
      return NextResponse.json(
        { error: 'Missing required fields: content, sender.address' },
        { status: 400 }
      );
    }

    const isAdmin = await isAdminAddress(senderInput.address);
    const role = isAdmin ? 'admin' : 'user';

    const message = await postLiveFeedMessage(
      {
        address: senderInput.address,
        name: senderInput.name,
        verified: isAdmin,
        role,
      },
      content,
      pinned
    );

    if (!message) {
      return NextResponse.json({ error: 'Failed to post message' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        timestamp:
          message.timestamp instanceof Date
            ? message.timestamp.toISOString()
            : String(message.timestamp),
      },
    });
  } catch (error) {
    console.error('Live feed POST error:', error);
    return NextResponse.json({ error: 'Failed to post message' }, { status: 500 });
  }
}
