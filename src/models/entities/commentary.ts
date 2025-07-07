import fbEntity from "./fbEntity"

export default interface commentary extends fbEntity {
    userId: string,
    text: string,
    petId: string,
    createdAt: string,
    editedAt?: string | null,
    parentId?: string | null;
}