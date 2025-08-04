// services/MessageService.ts
import FirebaseService from "./FirebaseService";
import message from "../models/entities/message";
import CreateMessageDTO_Req from "../DTOs/request/CreateMessageDTO_Req";

export default class MessageService {
  private firestore = new FirebaseService();

  async sendMessage(data: CreateMessageDTO_Req): Promise<string> {
    const newMessage = {
      ...data,
      read: false,
      createdAt: new Date().toISOString(),
    };

    const result = await this.firestore.register<message>("messages", newMessage);
    return result.id;
  }

  async getMessagesBetweenUsers(userA: string, userB: string): Promise<message[]> {
    const all = await this.firestore.list<message>("messages");

    return all.filter(
      m =>
        (m.userId === userA && m.receiverId === userB) ||
        (m.userId === userB && m.receiverId === userA)
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async markAsRead(messageId: string, currentUserId: string): Promise<boolean> {
    const msg = await this.firestore.get<message>("messages", messageId);
    if (!msg || msg.receiverId !== currentUserId) return false;

    await this.firestore.update<message>("messages", {
      ...msg,
      id: messageId,
      read: true,
    });

    return true;
  }
}
