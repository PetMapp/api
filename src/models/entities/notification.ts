import fbEntity from "./fbEntity"

export default interface notification extends fbEntity {
    userId: string;
    type: "reply" | "report_sent" | "report_actioned" | "animal_wanted" | "animal_found" | "comment_reply";
    relatedCommentId?: string;
    fromUserId?: string;
    statusMessage?: string;
    read: boolean;
    createdAt: string;
}
