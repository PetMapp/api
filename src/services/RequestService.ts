import FirebaseService from "./FirebaseService";
import request from "../models/entities/request";
import pet from "../models/entities/pet";
import * as admin from "firebase-admin";

export default class RequestService {
    private firestore = new FirebaseService();

    async createRequest(
        data: Omit<request, "id" | "createdAt"> & { createdAt?: string }
    ): Promise<request> {
        const newRequest: Omit<request, "id"> = {
            ...data,
            createdAt: data.createdAt ?? new Date().toISOString(),
        };

        return await this.firestore.register<request>("requests", newRequest);
    }

    async getRequestById(requestId: string): Promise<request | null> {
        return await this.firestore.get<request>("requests", requestId);
    }

    async getRequestsByUser(userId: string): Promise<(request & {
        fromUser: { displayName: string, photoURL: string | null },
        petOwner: { displayName: string, photoURL: string | null },
        pet: { apelido?: string, petImage?: string | null }
    })[]> {
        const snap = await admin
            .firestore()
            .collection("requests")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .get();

        const requests = snap.docs.map((d) => {
            const data = d.data() as request;
            return {
                ...data,
                id: d.id,
                status: data.status ?? 'pending',
            } as request;
        });

        const enriched: typeof requests[0][] = [];

        for (const req of requests) {
            let fromDisplayName = "Usuário";
            let fromPhotoURL: string | null = null;

            if (req.userId) {
                try {
                    const userRecord = await admin.auth().getUser(req.userId);
                    fromDisplayName = userRecord.displayName || fromDisplayName;
                    fromPhotoURL = userRecord.photoURL || null;
                } catch (e) {
                    console.warn(`Usuário ${req.userId} não encontrado.`);
                }
            }

            let ownerDisplayName = "Usuário";
            let ownerPhotoURL: string | null = null;

            try {
                const petDoc = await admin.firestore().collection("pets").doc(req.petId).get();
                if (petDoc.exists) {
                    const petData = petDoc.data() as pet;
                    const ownerRecord = await admin.auth().getUser(petData.userId);
                    ownerDisplayName = ownerRecord.displayName || ownerDisplayName;
                    ownerPhotoURL = ownerRecord.photoURL || null;
                }
            } catch (e) {
                console.warn(`Dono do pet não encontrado para pet ${req.petId}`);
            }

            let petDetails: { apelido?: string, petImage?: string | null } = {};
            try {
                const petDoc = await admin.firestore().collection("pets").doc(req.petId).get();
                if (petDoc.exists) {
                    const petData = petDoc.data() as pet;
                    const bucket = admin.storage().bucket();
                    const file = bucket.file(`pets/${req.petId}/thumb`);
                    const [petImage] = await file.getSignedUrl({ expires: Date.now() + 3600 * 1000, action: "read", version: "v4" });

                    petDetails = {
                        apelido: petData.apelido,
                        petImage,
                    };
                }
            } catch (e) {
                petDetails = { apelido: undefined, petImage: null };
            }

            enriched.push({
                ...req,
                fromUser: { displayName: fromDisplayName, photoURL: fromPhotoURL },
                petOwner: { displayName: ownerDisplayName, photoURL: ownerPhotoURL },
                pet: petDetails,
            });
        }

        return enriched;
    }


    async getRequestsForUserPet(userPetId: string): Promise<(request & {
        fromUser: { displayName: string, photoURL: string | null },
        petOwner: { displayName: string, photoURL: string | null },
        pet: { apelido?: string, petImage?: string | null }
    })[]> {
        const snap = await admin
            .firestore()
            .collection("requests")
            .where("userPetId", "==", userPetId)
            .orderBy("createdAt", "desc")
            .get();

        const requests = snap.docs.map((d) => {
            const data = d.data() as request;
            return { ...data, id: d.id, status: data.status ?? 'pending' } as request;
        });

        const enriched: typeof requests[0][] = [];

        for (const req of requests) {
            let fromDisplayName = "Usuário";
            let fromPhotoURL: string | null = null;

            if (req.userId) {
                try {
                    const userRecord = await admin.auth().getUser(req.userId);
                    fromDisplayName = userRecord.displayName || fromDisplayName;
                    fromPhotoURL = userRecord.photoURL || null;
                } catch (e) {
                    console.warn(`Usuário ${req.userId} não encontrado.`);
                }
            }

            let ownerDisplayName = "Usuário";
            let ownerPhotoURL: string | null = null;

            if (req.userPetId) {
                try {
                    const petDoc = await admin.firestore().collection("pets").doc(req.userPetId).get();
                    if (petDoc.exists) {
                        const petData = petDoc.data() as pet;
                        const ownerRecord = await admin.auth().getUser(petData.userId);
                        ownerDisplayName = ownerRecord.displayName || ownerDisplayName;
                        ownerPhotoURL = ownerRecord.photoURL || null;
                    }
                } catch (e) {
                    console.warn(`Dono do pet não encontrado para pet ${req.userPetId}`);
                }
            }

            let petDetails: { apelido?: string, petImage?: string | null } = {};
            try {
                const petDoc = await admin.firestore().collection("pets").doc(req.petId).get();
                if (petDoc.exists) {
                    const petData = petDoc.data() as pet;
                    const bucket = admin.storage().bucket();
                    const file = bucket.file(`pets/${req.petId}/thumb`);
                    const [petImage] = await file.getSignedUrl({ expires: Date.now() + 3600 * 1000, action: "read", version: "v4" });

                    petDetails = {
                        apelido: petData.apelido,
                        petImage,
                    };
                }
            } catch (e) {
                petDetails = { apelido: undefined, petImage: null };
            }

            enriched.push({
                ...req,
                fromUser: { displayName: fromDisplayName, photoURL: fromPhotoURL },
                petOwner: { displayName: ownerDisplayName, photoURL: ownerPhotoURL },
                pet: petDetails,
            });
        }

        return enriched;
    }

    async updateRequestStatus(
        requestId: string,
        status: "pending" | "accepted" | "rejected"
    ): Promise<request | null> {
        const req = await this.firestore.get<request>("requests", requestId);
        if (!req) return null;

        return await this.firestore.update<request>("requests", {
            ...req,
            status,
        });
    }

    async countRequestsByStatus(
        userId: string,
        status: "pending" | "accepted" | "rejected"
    ): Promise<number> {
        const snap = await admin
            .firestore()
            .collection("requests")
            .where("userId", "==", userId)
            .where("status", "==", status)
            .count()
            .get();

        return snap.data().count;
    }
}
