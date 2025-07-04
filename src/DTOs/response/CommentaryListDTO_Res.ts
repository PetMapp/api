export default interface CommentaryListDTO_Res {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  parentId?: string | null;
  user: {
    displayName: string;
    photoURL: string;
  };
}
