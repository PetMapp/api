import FirebaseService from "./FirebaseService";
import request from "../models/entities/request";
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

    async getRequestsByUser(userId: string): Promise<request[]> {
        const snap = await admin
            .firestore()
            .collection("requests")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .get();

        return snap.docs.map(
            (d) => ({ ...(d.data() as Omit<request, "id">), id: d.id }) as request
        );
    }

    async getRequestsForUserPet(userPetId: string): Promise<request[]> {
        const snap = await admin
            .firestore()
            .collection("requests")
            .where("userPetId", "==", userPetId)
            .orderBy("createdAt", "desc")
            .get();

        return snap.docs.map(
            (d) => ({ ...(d.data() as request) }) as request
        );
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