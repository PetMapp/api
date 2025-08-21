import fbEntity from "./fbEntity"

export default interface request extends fbEntity {
    userId: string,
    petId: string,
    userPetId: string,
    message?: string,
    status: "pending" | "accepted" | "rejected",
    createdAt: string,
    imageUrl: string | null,
    fromUser: {
        displayName: string,
        photoURL: string | null
    },
    petOwner: {
        displayName: string,
        photoURL: string | null
    },
    pet: {
        apelido?: string,
        petImage?: string | null
    }
}