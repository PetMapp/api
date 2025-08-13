// services/MessageService.ts
import FirebaseService from "./FirebaseService";
import message from "../models/entities/message";
import CreateMessageDTO_Req from "../DTOs/request/CreateMessageDTO_Req";
import * as admin from "firebase-admin";

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

  async countUnreadMessages(userId: string): Promise<number> {
    const messages = await this.firestore.list<message>("messages");

    return messages.filter(
      m => m.receiverId === userId && !m.read
    ).length;
  }

  async countUnreadMessagesBetweenUsers(userA: string, userB: string): Promise<number> {
    const messages = await this.getMessagesBetweenUsers(userA, userB);

    return messages.filter(m => m.receiverId === userA && !m.read).length;
  }

  async markAllAsReadBetweenUsers(userA: string, userB: string, currentUserId: string): Promise<void> {
    const messages = await this.getMessagesBetweenUsers(userA, userB);

    const unreadMessages = messages.filter(
      m => m.receiverId === currentUserId && !m.read
    );

    const updatePromises = unreadMessages.map(m =>
      this.firestore.update<message>("messages", {
        ...m,
        id: m.id,
        read: true,
      })
    );

    await Promise.all(updatePromises);
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

  async editMessage(messageId: string, newText: string, currentUserId: string): Promise<boolean> {
    const msg = await this.firestore.get<message>("messages", messageId);
    if (!msg || msg.userId !== currentUserId) return false;

    await this.firestore.update<message>("messages", {
      ...msg,
      id: messageId,
      text: newText,
    });

    return true;
  }

  async deleteMessage(messageId: string, currentUserId: string): Promise<boolean> {
    const msg = await this.firestore.get<message>("messages", messageId);
    if (!msg || msg.userId !== currentUserId) return false;

    await this.firestore.remove("messages", messageId);
    return true;
  }

  async getUsersWithMessages(userId: string): Promise<Array<{
    id: string;
    displayName: string;
    photo: string;
    lastMessage: message | null;
  }>> {
    const messages = await this.firestore.list<message>("messages");

    const userIds = new Set<string>();
    for (const msg of messages) {
      if (msg.userId === userId) userIds.add(msg.receiverId);
      else if (msg.receiverId === userId) userIds.add(msg.userId);
    }
    const otherUsers = Array.from(userIds);

    const result = [];

    // Função para buscar usuário no Firebase Authentication pelo Admin SDK
    async function getUserData(uid: string) {
      try {
        const userRecord = await admin.auth().getUser(uid);
        return {
          displayName: userRecord.displayName || "User",
          photo: userRecord.photoURL || "",
        };
      } catch {
        return { displayName: "User", photo: "" };
      }
    }

    for (const id of otherUsers) {
      const user = await getUserData(id);

      const msgs = messages.filter(
        m =>
          (m.userId === userId && m.receiverId === id) ||
          (m.userId === id && m.receiverId === userId)
      );
      msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const last = msgs[0] ?? null;

      result.push({
        id,
        displayName: user.displayName,
        photo: user.photo,
        lastMessage: last,
      });
    }

    return result;
  }
}
