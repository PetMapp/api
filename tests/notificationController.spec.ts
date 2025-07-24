import app from "../src";
import request from "supertest";
import FirebaseService from "../src/services/FirebaseService";
import notification from "../src/models/entities/notification";
import commentary from "../src/models/entities/commentary";
import { DecodedIdToken } from "firebase-admin/auth";

jest.mock('../src/middleware/authorize', () => {
  return jest.fn((req, res, next) => {
    req.user = { uid: 'usuario123' };
    next();
  });
});

jest.mock('../src/services/FirebaseService');
jest.mock('firebase-admin', () => {
  return {
    apps: [],
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(() => ({})),
    },
    auth: () => ({
      getUser: jest.fn((uid) => ({
        uid,
        displayName: uid === "outroUsuario" ? "Outro" : "Usuário Teste",
        photoURL: "https://fakeurl.com/photo.png",
      })),
    }),
    firestore: jest.fn(() => ({})),
  };
});


const MockFirebaseService = FirebaseService as jest.MockedClass<typeof FirebaseService>;

describe('POST /api/notification/create', () => {
  it('deve criar uma nova notificação', async () => {
    MockFirebaseService.prototype.register.mockResolvedValueOnce({ id: "notif123" });

    const response = await request(app)
      .post("/api/notification/create")
      .send({
        userId: "usuario123",
        type: "comment_reply",
        relatedCommentId: "comment123",
        fromUserId: "outroUsuario"
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBe("notif123");
  });
});



describe('PUT /api/notification/mark-as-read/:notificationId', () => {
  it('deve marcar uma notificação como lida', async () => {
    MockFirebaseService.prototype.get.mockResolvedValueOnce({
      id: "notif1",
      userId: "usuario123",
      read: false,
    } as notification);

    MockFirebaseService.prototype.update.mockResolvedValueOnce({ id: "notif1", read: true } as notification);

    const response = await request(app)
      .put("/api/notification/mark-as-read/notif1");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('deve retornar erro se notificação não existir ou pertencer a outro usuário', async () => {
    MockFirebaseService.prototype.get.mockResolvedValueOnce(null);

    const response = await request(app)
      .put("/api/notification/mark-as-read/notif404");

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errorMessage).toContain("Notificação não encontrada");
  });
});

describe('PUT /api/notification/mark-all-as-read', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve marcar todas as notificações do usuário como lidas', async () => {
    const notifs = [
      { id: "n1", userId: "usuario123", read: false },
      { id: "n2", userId: "usuario123", read: false },
    ] as notification[];

    const mockList = jest
      .spyOn(FirebaseService.prototype, 'list' as any)
      .mockResolvedValueOnce(notifs);

    const mockUpdate = jest
      .spyOn(FirebaseService.prototype, 'update' as any)
      .mockResolvedValue({} as any);

    const response = await request(app)
      .put("/api/notification/mark-all-as-read");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenNthCalledWith(
      1,
      "notifications",
      {
        ...notifs[0],
        read: true,
      }
    );
    expect(mockUpdate).toHaveBeenNthCalledWith(
      2,
      "notifications",
      {
        ...notifs[1],
        read: true,
      }
    );

    mockList.mockRestore();
    mockUpdate.mockRestore();
  });
});

describe('GET /api/notification/unread-count', () => {
  it('deve retornar o número de notificações não lidas do usuário', async () => {
    const notifs = [
      { userId: "usuario123", read: false },
      { userId: "usuario123", read: false },
      { userId: "usuario123", read: true },
      { userId: "outroUsuario", read: false }
    ] as notification[];

    MockFirebaseService.prototype.list.mockResolvedValueOnce(notifs);

    const response = await request(app)
      .get("/api/notification/unread-count");

    expect(response.statusCode).toBe(200);
    expect(response.body.data.count).toBe(2);
  });
});

describe('GET /api/notification/list', () => {
  it('deve listar notificações do usuário autenticado com dados do autor e pet relacionado', async () => {
    const notifications = [
      {
        id: "n1",
        userId: "usuario123",
        type: "comment_reply",
        relatedCommentId: "c1",
        fromUserId: "outroUsuario",
        statusMessage: "msg",
        read: false,
        createdAt: new Date().toISOString(),
      }
    ] as notification[];

    const commentMock = {
      id: "c1",
      petId: "pet123",
    } as commentary;

    MockFirebaseService.prototype.list.mockResolvedValueOnce(notifications);
    MockFirebaseService.prototype.get.mockResolvedValueOnce(commentMock);

    const response = await request(app)
      .get("/api/notification/list");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].fromUser.displayName).toBe("Outro");
    expect(response.body.data[0].relatedPetId).toBe("pet123");
  });

  it('deve lidar com erro ao buscar usuário ou comentário', async () => {
    const notifications = [
      {
        id: "n1",
        userId: "usuario123",
        type: "comment_reply",
        relatedCommentId: "c1",
        fromUserId: "invalido",
        read: false,
        createdAt: new Date().toISOString(),
      }
    ] as notification[];

    // Simula erro ao buscar comentário
    MockFirebaseService.prototype.list.mockResolvedValueOnce(notifications);
    MockFirebaseService.prototype.get.mockRejectedValueOnce(new Error("Comentário não encontrado"));

    const response = await request(app)
      .get("/api/notification/list");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(1);
    
  });
});