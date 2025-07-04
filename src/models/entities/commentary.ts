import fbEntity from "./fbEntity"

export default interface commentary extends fbEntity {
    userId: string,
    text: string,
    petId: string,
    createdAt: string,
    parentId?: string | null;
}