export default interface CommentaryListDTO_Res {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  user: {
    displayName: string;
    photoURL: string;
  };
}
