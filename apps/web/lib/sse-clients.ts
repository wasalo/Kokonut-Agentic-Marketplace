const clients = new Map<string, ReadableStreamDefaultController>();

export function sendMessageToClient(conversationId: string, data: string) {
  const controller = clients.get(conversationId);
  if (controller) {
    controller.enqueue(`data: ${data}\n\n`);
  }
}

export function registerStreamClient(conversationId: string, controller: ReadableStreamDefaultController) {
  clients.set(conversationId, controller);
}

export function removeStreamClient(conversationId: string) {
  clients.delete(conversationId);
}
