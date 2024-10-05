// firebase.ts
import * as admin from 'firebase-admin';
import serviceAccount from '../config/firebase-service-account.json';

let db: FirebaseFirestore.Firestore;
let auth: admin.auth.Auth;

export const started = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    console.log("Firebase inicializado com sucesso.");
  }
  
  // Inicializa apenas após garantir que o app está configurado.
  db = admin.firestore();
  auth = admin.auth();
};

export { admin, db, auth };
export default started;
