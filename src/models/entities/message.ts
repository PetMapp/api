import fbEntity from "./fbEntity";

export default interface message extends fbEntity {
    userId: string;
    receiverId: string;
    text: string;
    relatedCommentId?: string;
    relatedPetId?: string;
    createdAt: string;
    read: boolean;
    replyToMessageId?: string;
}