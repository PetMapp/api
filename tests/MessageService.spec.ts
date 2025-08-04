import MessageService from "../src/services/MessageService";
import FirebaseService from "../src/services/FirebaseService";
import { jest } from "@jest/globals";
import message from "../src/models/entities/message";

jest.mock("../src/services/FirebaseService");

const MockedFirebase = FirebaseService as jest.MockedClass<typeof FirebaseService>;

describe("MessageService", () => {
    let service: MessageService;
    let mockFirestore: jest.Mocked<FirebaseService>;

    beforeEach(() => {
        mockFirestore = new MockedFirebase() as jest.Mocked<FirebaseService>;
        service = new MessageService();
        (service as any).firestore = mockFirestore;
    });

    it("deve enviar uma nova mensagem", async () => {
        const fakeId = "abc123";
        mockFirestore.register.mockResolvedValue({ id: fakeId });

        const result = await service.sendMessage({
            userId: "user1",
            receiverId: "user2",
            text: "Olá!",
        });

        expect(mockFirestore.register).toHaveBeenCalledWith("messages", expect.objectContaining({
            userId: "user1",
            receiverId: "user2",
            text: "Olá!",
            read: false
        }));

        expect(result).toBe(fakeId);
    });

    it("deve buscar mensagens entre dois usuários", async () => {
        const mensagens: message[] = [
            {
                id: "1",
                userId: "user1",
                receiverId: "user2",
                text: "Oi",
                createdAt: new Date().toISOString(),
                read: false
            },
            {
                id: "2",
                userId: "user2",
                receiverId: "user1",
                text: "Olá",
                createdAt: new Date().toISOString(),
                read: true
            },
            {
                id: "3",
                userId: "user3",
                receiverId: "user1",
                text: "Mensagem fora do contexto",
                createdAt: new Date().toISOString(),
                read: false
            }
        ];

        mockFirestore.list.mockResolvedValue(mensagens);

        const result = await service.getMessagesBetweenUsers("user1", "user2");

        expect(result).toHaveLength(2);
        expect(result.map(m => m.id)).toEqual(["1", "2"]);
    });

    it("deve marcar a mensagem como lida se for do usuário correto", async () => {
        const msg: message = {
            id: "msg1",
            userId: "user1",
            receiverId: "user2",
            text: "oi",
            createdAt: new Date().toISOString(),
            read: false
        };

        mockFirestore.get.mockResolvedValue(msg);
        mockFirestore.update.mockResolvedValue(msg);

        const result = await service.markAsRead("msg1", "user2");

        expect(result).toBe(true);
        expect(mockFirestore.update).toHaveBeenCalledWith("messages", {
            ...msg,
            id: "msg1",
            read: true
        });
    });

    it("não deve marcar como lida se o usuário não for o destinatário", async () => {
        const msg: message = {
            id: "msg1",
            userId: "user1",
            receiverId: "user2",
            text: "oi",
            createdAt: new Date().toISOString(),
            read: false
        };

        mockFirestore.get.mockResolvedValue(msg);

        const result = await service.markAsRead("msg1", "user3");

        expect(result).toBe(false);
        expect(mockFirestore.update).not.toHaveBeenCalled();
    });

    it("deve enviar uma mensagem relacionada a um pet", async () => {
        const fakeId = "msg-pet-001";
        mockFirestore.register.mockResolvedValue({ id: fakeId });

        const result = await service.sendMessage({
            userId: "user1",
            receiverId: "user2",
            text: "Olá, sobre seu pet!",
            relatedPetId: "pet123"
        });

        expect(mockFirestore.register).toHaveBeenCalledWith("messages", expect.objectContaining({
            userId: "user1",
            receiverId: "user2",
            text: "Olá, sobre seu pet!",
            relatedPetId: "pet123",
            read: false
        }));

        expect(result).toBe(fakeId);
    });

    it("deve enviar uma mensagem relacionada a um comentário", async () => {
        const fakeId = "msg-comment-001";
        mockFirestore.register.mockResolvedValue({ id: fakeId });

        const result = await service.sendMessage({
            userId: "user1",
            receiverId: "user2",
            text: "Sobre seu comentário...",
            relatedCommentId: "comment123"
        });

        expect(mockFirestore.register).toHaveBeenCalledWith("messages", expect.objectContaining({
            userId: "user1",
            receiverId: "user2",
            text: "Sobre seu comentário...",
            relatedCommentId: "comment123",
            read: false
        }));

        expect(result).toBe(fakeId);
    });

    it("deve enviar uma mensagem em resposta a outra mensagem", async () => {
        const fakeId = "msg-reply-001";
        mockFirestore.register.mockResolvedValue({ id: fakeId });

        const result = await service.sendMessage({
            userId: "user2",
            receiverId: "user1",
            text: "Respondendo sua mensagem.",
            replyToMessageId: "msg-original-001"
        });

        expect(mockFirestore.register).toHaveBeenCalledWith("messages", expect.objectContaining({
            userId: "user2",
            receiverId: "user1",
            text: "Respondendo sua mensagem.",
            replyToMessageId: "msg-original-001",
            read: false
        }));

        expect(result).toBe(fakeId);
    });
    
    it("deve retornar uma lista vazia se não houver mensagens entre os usuários", async () => {
        mockFirestore.list.mockResolvedValue([]);

        const result = await service.getMessagesBetweenUsers("user1", "user2");

        expect(result).toHaveLength(0);
    });
});


