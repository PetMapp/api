export default interface NotificationListDTO_Res {
  id: string;
  userId: string;
  type: string;
  relatedCommentId?: string;
  relatedPetId?: string;
  fromUserId?: string;
  statusMessage?: string;
  read: boolean;
  createdAt: string;
  fromUser?: {
    displayName: string;
    photoURL: string | null;
  };
}