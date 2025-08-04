export default interface CreateMessageDTO_Req {
    userId: string;
    receiverId: string;
    text: string;
    relatedCommentId?: string;
    relatedPetId?: string;
    replyToMessageId?: string;
}
