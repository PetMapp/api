import FirebaseService from "./FirebaseService";
import notification from "../models/entities/notification";
import CreateNotificationDTO_Req from "../DTOs/request/CreateNotificationDTO_Req";

export default class NotificationService {
  private fireservice = new FirebaseService();

  async createNotification(data: CreateNotificationDTO_Req): Promise<string> {
    const newNotification = await this.fireservice.register<notification>("notifications", {
      ...data,
      read: false,
      createdAt: new Date().toISOString()
    });

    return newNotification.id;
  }
}
