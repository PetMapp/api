import { WebSocket } from 'ws';

export default class WebSocketNotifier {
  private clients: Map<string, WebSocket>;

  constructor(clients: Map<string, WebSocket>) {
    this.clients = clients;
  }

  notifyMessagesRead(userA: string, userB: string, readBy: string) {
    const payload = {
      event: 'messagesRead',
      data: { userA, userB, readBy }
    };

    [userA, userB].forEach(userId => {
      const ws = this.clients.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    });
  }
}
