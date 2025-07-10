export default interface CreateNotificationDTO_Req {
  userId: string;
  type: "reply" | "report_sent" | "report_actioned" | "animal_wanted" | "animal_found" | "comment_reply";
  relatedCommentId: string;
  fromUserId?: string;
  statusMessage?: string;
}