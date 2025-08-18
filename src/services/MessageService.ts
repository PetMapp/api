import FirebaseService from "./FirebaseService";
import message from "../models/entities/message";
import CreateMessageDTO_Req from "../DTOs/request/CreateMessageDTO_Req";
import * as admin from "firebase-admin";
import { makeConversationKey } from "../utils/conversationKey";

export default class MessageService {
  private firestore = new FirebaseService();

  async sendMessage(data: CreateMessageDTO_Req): Promise<string> {
    const newMessage = {
      ...data,
      read: false,
      createdAt: new Date().toISOString(),
      conversationKey: makeConversationKey(data.userId, data.receiverId),
      participants: [data.userId, data.receiverId]
    };

    const result = await admin.firestore().collection("messages").add(newMessage);
    return result.id;
  }

  async getMessagesBetweenUsers(userA: string, userB: string): Promise<message[]> {
    const key = makeConversationKey(userA, userB);
    const col = admin.firestore().collection("messages");

    let snap = await col.where("conversationKey", "==", key).get();
    let messages = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as message));

    if (messages.length === 0) {
      const [aToB, bToA] = await Promise.all([
        col.where("userId", "==", userA).where("receiverId", "==", userB).get(),
        col.where("userId", "==", userB).where("receiverId", "==", userA).get(),
      ]);
      messages = [...aToB.docs, ...bToA.docs].map(d => ({ id: d.id, ...(d.data() as any) } as message));
    }

    return messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async countUnreadMessages(userId: string): Promise<number> {
    const snap = await admin.firestore()
      .collection("messages")
      .where("receiverId", "==", userId)
      .where("read", "==", false)
      .count()
      .get();

    return snap.data().count;
  }

  async countUnreadMessagesBetweenUsers(userA: string, userB: string): Promise<number> {
    const key = makeConversationKey(userA, userB);
    const agg = await admin.firestore()
      .collection("messages")
      .where("conversationKey", "==", key)
      .where("receiverId", "==", userA)
      .where("read", "==", false)
      .count()
      .get();

    return agg.data().count;
  }

  async markAllAsReadBetweenUsers(userA: string, userB: string, currentUserId: string): Promise<void> {
    const key = makeConversationKey(userA, userB);

    const snap = await admin.firestore()
      .collection("messages")
      .where("conversationKey", "==", key)
      .where("receiverId", "==", currentUserId)
      .where("read", "==", false)
      .get();

    if (snap.empty) return;

    const batch = admin.firestore().batch();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
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

  async getUsersWithMessages(userId: string) {
    const snap = await admin.firestore()
      .collection("messages")
      .where("participants", "array-contains", userId)
      .orderBy("createdAt", "desc")
      .get();

    const conversationsMap: Record<string, message> = {};

    snap.docs.forEach(doc => {
      const msg = doc.data() as message;
      const otherUserId = msg.userId === userId ? msg.receiverId : msg.userId;

      if (!conversationsMap[otherUserId]) {
        conversationsMap[otherUserId] = { ...msg };
      }
    });

    const otherUserIds = Object.keys(conversationsMap);

    const result = await Promise.all(
      otherUserIds.map(async id => {
        try {
          const userRecord = await admin.auth().getUser(id);
          return {
            id,
            displayName: userRecord.displayName || "User",
            photo: userRecord.photoURL || "",
            lastMessage: conversationsMap[id]
          };
        } catch {
          return {
            id,
            displayName: "User",
            photo: "",
            lastMessage: conversationsMap[id]
          };
        }
      })
    );

    return result;
  }
}
