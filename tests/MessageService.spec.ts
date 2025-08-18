import MessageService from "../src/services/MessageService";
import * as admin from "firebase-admin";
import FirebaseService from "../src/services/FirebaseService";

const mockFirestore = {
    collection: jest.fn(() => ({
        add: jest.fn(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn(),
        count: jest.fn().mockReturnThis(),
    })),
};

jest.mock("firebase-admin", () => ({
    firestore: jest.fn(() => mockFirestore),
}));

jest.mock("../src/services/FirebaseService");

describe("MessageService", () => {
    let service: MessageService;
    let firebaseServiceMock: any;
    let mockCollection: any;

    beforeEach(() => {
        service = new MessageService();
        firebaseServiceMock = (FirebaseService as jest.Mock).mock.instances[0];
        
        mockCollection = {
            add: jest.fn(),
            where: jest.fn().mockReturnThis(),
            get: jest.fn(),
            count: jest.fn().mockReturnThis(),
        };
        
        mockFirestore.collection.mockReturnValue(mockCollection);
        jest.clearAllMocks();
    });

    it("deve enviar uma nova mensagem", async () => {
        mockCollection.add.mockResolvedValue({ id: "msg123" });

        const result = await service.sendMessage({
            userId: "user1",
            receiverId: "user2",
            text: "Olá!",
        });

        expect(mockFirestore.collection).toHaveBeenCalledWith("messages");
        expect(mockCollection.add).toHaveBeenCalled();
        expect(result).toBe("msg123");
    });

    it("deve buscar mensagens entre dois usuários", async () => {
        mockCollection.get.mockResolvedValueOnce({
            docs: [
                { id: "1", data: () => ({ createdAt: "2025-01-01", text: "Oi" }) },
            ],
        });

        const messages = await service.getMessagesBetweenUsers("user1", "user2");

        expect(mockFirestore.collection).toHaveBeenCalledWith("messages");
        expect(mockCollection.where).toHaveBeenCalled();
        expect(mockCollection.get).toHaveBeenCalled();
        expect(messages).toHaveLength(1);
        expect(messages[0].text).toBe("Oi");
    });

    it("deve contar mensagens não lidas", async () => {
        mockCollection.get.mockResolvedValueOnce({
            data: () => ({ count: 5 }),
        });

        const count = await service.countUnreadMessages("user2");
        
        expect(mockFirestore.collection).toHaveBeenCalledWith("messages");
        expect(mockCollection.where).toHaveBeenCalledWith("receiverId", "==", "user2");
        expect(mockCollection.where).toHaveBeenCalledWith("read", "==", false);
        expect(mockCollection.count).toHaveBeenCalled();
        expect(mockCollection.get).toHaveBeenCalled();
        expect(count).toBe(5);
    });

    it("deve marcar uma mensagem como lida", async () => {
        firebaseServiceMock.get.mockResolvedValue({
            id: "msg1",
            receiverId: "user1",
            read: false,
        });

        const result = await service.markAsRead("msg1", "user1");

        expect(firebaseServiceMock.update).toHaveBeenCalled();
        expect(result).toBe(true);
    });

    it("não deve marcar como lida se o usuário não for o receiver", async () => {
        firebaseServiceMock.get.mockResolvedValue({
            id: "msg1",
            receiverId: "user2",
        });

        const result = await service.markAsRead("msg1", "user1");

        expect(firebaseServiceMock.update).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });

    it("deve editar mensagem se o usuário for o autor", async () => {
        firebaseServiceMock.get.mockResolvedValue({
            id: "msg1",
            userId: "user1",
            text: "Antigo",
        });

        const result = await service.editMessage("msg1", "Novo texto", "user1");

        expect(firebaseServiceMock.update).toHaveBeenCalledWith("messages", {
            id: "msg1",
            userId: "user1",
            text: "Novo texto",
        });
        expect(result).toBe(true);
    });

    it("não deve editar mensagem de outro usuário", async () => {
        firebaseServiceMock.get.mockResolvedValue({
            id: "msg1",
            userId: "user2",
            text: "Antigo",
        });

        const result = await service.editMessage("msg1", "Novo texto", "user1");

        expect(firebaseServiceMock.update).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });

    it("deve deletar mensagem se o usuário for o autor", async () => {
        firebaseServiceMock.get.mockResolvedValue({
            id: "msg1",
            userId: "user1",
        });

        const result = await service.deleteMessage("msg1", "user1");

        expect(firebaseServiceMock.remove).toHaveBeenCalledWith("messages", "msg1");
        expect(result).toBe(true);
    });

    it("não deve deletar mensagem de outro usuário", async () => {
        firebaseServiceMock.get.mockResolvedValue({
            id: "msg1",
            userId: "user2",
        });

        const result = await service.deleteMessage("msg1", "user1");

        expect(firebaseServiceMock.remove).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });
});