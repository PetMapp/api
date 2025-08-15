export default interface UpdateRequestStatusDTO_Req {
  requestId: string;
  status: "pending" | "accepted" | "rejected";
}
