import { db } from '../../firebase';
import fbEntity from '../models/fbEntity';


class FirebaseService {
    async list<T extends fbEntity>(collectionPath: string): Promise<T[]> {
        var collection = db.collection(collectionPath);
        var collectionList = await collection.get();
        const list: any[] = [];

        collectionList.forEach((doc) => {
            list.push({
                id: doc.id,
                ...doc.data()
            })
        })

        return list;
    }

    async register<T extends fbEntity>(collectionPath: string, newItem: Omit<T, 'id'>){
        await db.collection(collectionPath).add(newItem);
    }
}

export default FirebaseService;