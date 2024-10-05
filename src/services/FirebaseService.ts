import { db } from '../firebase';
import fbEntity from '../models/entities/fbEntity';

// Definição da interface QueryCriteria com a sintaxe correta
type QueryCriteria<T> = {
    [Property in keyof T]?: {
      operator: FirebaseFirestore.WhereFilterOp; // Definir os operadores permitidos pelo Firestore
      value: T[Property]; // Definir o tipo do valor com base na propriedade `Property`
    };
  }

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

    async get<T extends fbEntity>(collectionPath: string, id: string): Promise<T | null> {
        const docRef = db.collection(collectionPath).doc(id); // Referência ao documento
        const doc = await docRef.get(); // Buscar o documento

        if (!doc.exists) {
            console.log(`Documento com ID ${id} não encontrado na coleção ${collectionPath}`);
            return null;
        }

        return {
            id: doc.id,
            ...doc.data(),
        } as T;
    }

    async register<T extends fbEntity>(collectionPath: string, newItem: Omit<T, 'id'>): Promise<T> {
        const docRef = await db.collection(collectionPath).add(newItem);
        const doc = await docRef.get();
        return {
            id: doc.id,
            ...doc.data()
        } as T
    }

    async update<T extends fbEntity>(collectionPath: string, updatedItem: T): Promise<T> {
        const docRef = db.collection(collectionPath).doc(updatedItem.id);
        
        // Criar uma cópia de `updatedItem` e remover a propriedade `id`
        const { id, ...dataWithoutId } = updatedItem;
      
        // Realizar a atualização no documento, excluindo a propriedade `id`
        await docRef.update(dataWithoutId);
      
        const doc = await docRef.get();
        return {
          id: doc.id,
          ...doc.data(),
        } as T;
      }

    async find<T extends fbEntity>(
        collectionPath: string,
        criteria: QueryCriteria<Omit<T, 'id'>>
    ): Promise<T | null> {
        // Inicializar `query` como do tipo `FirebaseFirestore.Query`
        let query: FirebaseFirestore.Query = db.collection(collectionPath);

        // Aplicar a query com base no critério fornecido (para cada chave no objeto)
        Object.keys(criteria).forEach((key) => {
            const condition = criteria[key as keyof typeof criteria]; // Obter o operador e o valor do critério
            if (condition !== undefined) {
                query = query.where(key, condition.operator, condition.value); // Aplicar o filtro com o operador especificado
            }
        });

        // Limitar o resultado a 1 e obter o documento
        const result = await query.limit(1).get();

        // Se não encontrar nenhum documento, retornar null
        if (result.empty) {
            console.log(`Nenhum documento encontrado com os critérios fornecidos na coleção ${collectionPath}`);
            return null;
        }

        // Retornar o primeiro documento encontrado
        const doc = result.docs[0];
        return {
            id: doc.id,
            ...doc.data(),
        } as T;
    }


    async remove(collectionPath: string, id: string): Promise<boolean> {
        try {
          // Referenciar o documento com base no `id` fornecido
          const docRef = db.collection(collectionPath).doc(id);
    
          // Deletar o documento
          await docRef.delete();
    
          console.log(`Documento com ID ${id} removido com sucesso na coleção ${collectionPath}`);
          return true; // Retornar `true` como confirmação de remoção bem-sucedida
        } catch (error) {
          console.error(`Erro ao remover o documento com ID ${id}:`, error);
          return false; // Retornar `false` se a remoção falhar
        }
      }


}

export default FirebaseService;