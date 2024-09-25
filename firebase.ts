// firebase.ts
import * as admin from 'firebase-admin';
import serviceAccount from './config/firebase-service-account.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();
const auth = admin.auth();
export { admin, db , auth};
