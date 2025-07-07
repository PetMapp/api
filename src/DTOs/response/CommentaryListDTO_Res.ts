export default interface CommentaryListDTO_Res {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  editedAt?: string | null;
  parentId?: string | null;
  user: {
    displayName: string;
    photoURL: string;
  };
}
