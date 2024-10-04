"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../../firebase");
class FirebaseService {
    list(collectionPath) {
        return __awaiter(this, void 0, void 0, function* () {
            var collection = firebase_1.db.collection(collectionPath);
            var collectionList = yield collection.get();
            const list = [];
            collectionList.forEach((doc) => {
                list.push(Object.assign({ id: doc.id }, doc.data()));
            });
            return list;
        });
    }
    get(collectionPath, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = firebase_1.db.collection(collectionPath).doc(id); // Referência ao documento
            const doc = yield docRef.get(); // Buscar o documento
            if (!doc.exists) {
                console.log(`Documento com ID ${id} não encontrado na coleção ${collectionPath}`);
                return null;
            }
            return Object.assign({ id: doc.id }, doc.data());
        });
    }
    register(collectionPath, newItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = yield firebase_1.db.collection(collectionPath).add(newItem);
            const doc = yield docRef.get();
            return Object.assign({ id: doc.id }, doc.data());
        });
    }
    update(collectionPath, updatedItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = firebase_1.db.collection(collectionPath).doc(updatedItem.id);
            // Criar uma cópia de `updatedItem` e remover a propriedade `id`
            const { id } = updatedItem, dataWithoutId = __rest(updatedItem, ["id"]);
            // Realizar a atualização no documento, excluindo a propriedade `id`
            yield docRef.update(dataWithoutId);
            const doc = yield docRef.get();
            return Object.assign({ id: doc.id }, doc.data());
        });
    }
    find(collectionPath, criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            // Inicializar `query` como do tipo `FirebaseFirestore.Query`
            let query = firebase_1.db.collection(collectionPath);
            // Aplicar a query com base no critério fornecido (para cada chave no objeto)
            Object.keys(criteria).forEach((key) => {
                const condition = criteria[key]; // Obter o operador e o valor do critério
                if (condition !== undefined) {
                    query = query.where(key, condition.operator, condition.value); // Aplicar o filtro com o operador especificado
                }
            });
            // Limitar o resultado a 1 e obter o documento
            const result = yield query.limit(1).get();
            // Se não encontrar nenhum documento, retornar null
            if (result.empty) {
                console.log(`Nenhum documento encontrado com os critérios fornecidos na coleção ${collectionPath}`);
                return null;
            }
            // Retornar o primeiro documento encontrado
            const doc = result.docs[0];
            return Object.assign({ id: doc.id }, doc.data());
        });
    }
    remove(collectionPath, id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Referenciar o documento com base no `id` fornecido
                const docRef = firebase_1.db.collection(collectionPath).doc(id);
                // Deletar o documento
                yield docRef.delete();
                console.log(`Documento com ID ${id} removido com sucesso na coleção ${collectionPath}`);
                return true; // Retornar `true` como confirmação de remoção bem-sucedida
            }
            catch (error) {
                console.error(`Erro ao remover o documento com ID ${id}:`, error);
                return false; // Retornar `false` se a remoção falhar
            }
        });
    }
}
exports.default = FirebaseService;
