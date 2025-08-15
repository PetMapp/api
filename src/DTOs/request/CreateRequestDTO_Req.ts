export default interface CreateRequestDTO_Req {
  userId: string;
  petId: string;
  userPetId: string;
  message?: string;
  status: "pending" | "accepted" | "rejected";
  imageUrl?: string | null;
}
