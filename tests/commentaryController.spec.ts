import app from "../src";
import request from "supertest";
import FirebaseService from "../src/services/FirebaseService";
import NotificationService from "../src/services/notificationService";
import { DecodedIdToken } from "firebase-admin/auth";
import { admin } from "../src/firebase";

// Mock do middleware de autorização para injetar req.user
jest.mock('../src/middleware/authorize', () => {
    return jest.fn((req, res, next) => {
        req.user = {
            uid: 'user1',
            aud: '',
            auth_time: 0,
            exp: 0,
            firebase: { identities: {}, sign_in_provider: '' },
            iat: 0,
            iss: '',
            sub: '',
        } as DecodedIdToken;
        next();
    });
});

jest.mock('../src/services/FirebaseService');
jest.mock('../src/services/notificationService');
jest.mock("../src/firebase", () => {
    const getUserByEmail = jest.fn();
    const createUser = jest.fn();
    const getUser = jest.fn();
    return {
        admin: {
            auth: () => ({ getUserByEmail, createUser, getUser })
        },
        started: jest.fn(),
        db: undefined,
        auth: undefined,
    };
});

const MockFirebaseService = FirebaseService as jest.MockedClass<typeof FirebaseService>;
const MockNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;

describe('CommentaryController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('deve criar um novo comentário e enviar notificação', async () => {
        // Simula o novo comentário criado
        MockFirebaseService.prototype.register.mockResolvedValue({ id: 'new-comment-id' } as any);

        // Simula o dono do pet
        MockFirebaseService.prototype.get.mockImplementation((collection, id) => {
            if (collection === "pets") {
                return Promise.resolve({ id: "123", userId: "456" });
            }
            return Promise.resolve(null);
        });

        const mockCreateNotification = jest.fn().mockResolvedValue({
            id: "mock-id",
            userId: "destino-id",
            type: "comment_reply",
            read: false,
            createdAt: new Date().toISOString(),
        });

        MockNotificationService.prototype.createNotification = mockCreateNotification;

        const response = await request(app)
            .post("/api/commentary/create")
            .send({
                petId: "pet-123",
                text: "comentário no pet",
                parentId: null // comentário direto, não é resposta
            });

        expect(response.status).toBe(200); // rota retorna 200, não 201
        expect(response.body.success).toBe(true);

        // Verifica se notificou corretamente
        expect(mockCreateNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "456",
                type: "comment_reply",
                fromUserId: "user1",
                relatedCommentId: "new-comment-id",
                statusMessage: "Comentou no seu pet!",
            })
        );
    });

    it('deve criar uma nova resposta e enviar notificação', async () => {
        // Mocka criação do novo comentário
        MockFirebaseService.prototype.register.mockResolvedValue({ id: 'new-comment-id' } as any);

        // Mocka o comentário pai e o pet (relação indireta)
        MockFirebaseService.prototype.get.mockImplementation((collection, id) => {
            if (collection === "pets") {
                return Promise.resolve({ id: "123", userId: "456" });
            }
            if (collection === "commentaries") {
                return Promise.resolve({ id: "parent-id", userId: "456" });
            }
            return Promise.resolve(null);
        });

        const mockCreateNotification = jest.fn().mockResolvedValue({
            id: "notif-id",
            userId: "456",
            type: "reply",
            read: false,
            createdAt: new Date().toISOString(),
        });

        MockNotificationService.prototype.createNotification = mockCreateNotification;

        const response = await request(app)
            .post("/api/commentary/create")
            .send({
                petId: "pet-123",
                text: "Resposta ao comentário",
                parentId: "parent-comment-id"
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        expect(mockCreateNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "456",
                type: "reply",
                fromUserId: "user1",
                relatedCommentId: "new-comment-id",
                statusMessage: "Respondeu seu comentário!"
            })
        );
    });

    it('deve retornar erro ao tentar comentar em pet inexistente', async () => {
        // Simula pet não encontrado
        MockFirebaseService.prototype.get.mockResolvedValue(null);

        const response = await request(app)
            .post("/api/commentary/create")
            .send({
                petId: "pet-invalido",
                text: "Tentativa de comentar",
                parentId: null
            });

        expect(response.status).toBe(404); // ou 400, dependendo do seu controller
        expect(response.body.success).toBe(false);
        expect(response.body.errorMessage).toContain("Pet");
    });

    describe('GET /commentary/list/:petId', () => {
        it('deve listar comentários de um pet', async () => {
            const fakeComments = [
                { id: 'c1', petId: 'p1', userId: 'user1', text: 'A', createdAt: '2025-07-20T10:00:00Z', parentId: null, deletedAt: null } as any,
            ];
            MockFirebaseService.prototype.list.mockResolvedValue(fakeComments);
            (admin.auth().getUser as jest.Mock).mockResolvedValue({ displayName: 'Test User', photoURL: 'url' });

            const response = await request(app).get('/api/commentary/list/p1');
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0]).toMatchObject({ id: 'c1', user: { displayName: 'Test User', photoURL: 'url' } });
        });
    });

    describe('PUT /commentary/edit', () => {
        it('deve editar comentário próprio', async () => {
            MockFirebaseService.prototype.get.mockResolvedValue({ id: 'c1', userId: 'user1', petId: 'p1', createdAt: '2025-07-20T10:00:00Z', parentId: null } as any);
            MockFirebaseService.prototype.update.mockResolvedValue({ id: "mock-notification-id" });

            const response = await request(app)
                .put('/api/commentary/edit')
                .send({ commentaryId: 'c1', newText: 'Edited' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('deve recusar edição de comentário de outro usuário', async () => {
            MockFirebaseService.prototype.get.mockResolvedValue({ id: 'c2', userId: 'other', petId: 'p1', createdAt: '2025-07-20T10:00:00Z', parentId: null } as any);

            const response = await request(app)
                .put('/api/commentary/edit')
                .send({ commentaryId: 'c2', newText: 'Edited' });

            expect(response.status).toBe(400);
            expect(response.body.errorMessage).toContain('perm');
        });
    });

    describe('DELETE /commentary/remove', () => {
        it('deve remover comentário próprio', async () => {
            MockFirebaseService.prototype.get.mockResolvedValue({ id: 'c1', userId: 'user1' } as any);
            MockFirebaseService.prototype.update.mockResolvedValue({ id: "mock-notification-id" });

            const response = await request(app)
                .delete('/api/commentary/remove')
                .send({ commentaryId: 'c1' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /commentary/count-replies/:commentId', () => {
        it('deve contar respostas recursivas', async () => {
            const allComments = [
                { id: 'c1', parentId: 'c0', deletedAt: null } as any,
                { id: 'c2', parentId: 'c1', deletedAt: null } as any,
            ];
            MockFirebaseService.prototype.list.mockResolvedValue(allComments);

            const response = await request(app).get('/api/commentary/count-replies/c0');
            expect(response.status).toBe(200);
            expect(response.body.data).toBe(2);
        });
    });

    describe('GET /commentary/:id', () => {
        it('deve buscar comentário por ID', async () => {
            MockFirebaseService.prototype.get.mockResolvedValue({ id: 'c1', userId: 'user1', text: 'Hi', createdAt: '2025-07-20T10:00:00Z', deletedAt: null, parentId: null } as any);
            (admin.auth().getUser as jest.Mock).mockResolvedValue({ displayName: 'User', photoURL: 'url' });

            const response = await request(app).get('/api/commentary/c1');
            expect(response.status).toBe(200);
            expect(response.body.data).toMatchObject({ id: 'c1', user: { displayName: 'User' } });
        });
    });
});
