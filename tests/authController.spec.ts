import request from "supertest";
import app from "../src"; // Importa o app principal, como você fez nos outros testes
import FirebaseService from "../src/services/FirebaseService";
import { admin } from "../src/firebase";
import user from "../src/models/entities/user";

// Mocks do Firebase Admin SDK
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

// Mock da classe FirebaseService
jest.mock("../src/services/FirebaseService");
const MockFirebaseService = FirebaseService as jest.MockedClass<typeof FirebaseService>;
const auth = admin.auth() as jest.Mocked<any>;

describe("AuthController", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("POST /api/auth/register", () => {
        it("deve registrar um novo usuário com sucesso", async () => {
            auth.getUserByEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });
            auth.createUser.mockResolvedValueOnce({ uid: "123456" });

            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    nome: "João",
                    email: "joao@email.com",
                    senha: "123456",
                    confirmarSenha: "123456"
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.message).toBe("Usuário registrado com sucesso");
        });

        it("deve retornar erro se email já estiver cadastrado", async () => {
            auth.getUserByEmail.mockResolvedValueOnce({ uid: "existente" });

            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    nome: "João",
                    email: "joao@email.com",
                    senha: "123456",
                    confirmarSenha: "123456"
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.errorMessage).toBe("E-mail já cadastrado.");
        });

        it("deve retornar erro se as senhas não coincidirem", async () => {
            auth.getUserByEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });

            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    nome: "João",
                    email: "joao@email.com",
                    senha: "123456",
                    confirmarSenha: "outraSenha"
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.errorMessage).toBe("Suas senhas não coincidem.");
        });

        it("deve retornar erro se falhar ao registrar", async () => {
            auth.getUserByEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });
            auth.createUser.mockRejectedValueOnce(new Error("Erro interno"));

            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    nome: "João",
                    email: "joao@email.com",
                    senha: "123456",
                    confirmarSenha: "123456"
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.errorMessage).toBe("Não foi possível registrar o usuário.");
        });
    });
   
    describe("GET /api/auth/users", () => {
        it("deve retornar a lista de usuários", async () => {
            MockFirebaseService.prototype.list.mockResolvedValue([
                { id: "1", nome: "João" },
                { id: "2", nome: "Maria" }
            ] as user[]);

            const response = await request(app).get("/api/auth/users");

            expect(response.statusCode).toBe(200);
            expect(response.body.length).toBe(2);
        });
    });

    describe("GET /api/auth/user/:id", () => {
        it("deve retornar usuário por ID", async () => {
            auth.getUser.mockResolvedValueOnce({ uid: "1", displayName: "João" });

            const response = await request(app).get("/api/auth/user/1");

            expect(response.statusCode).toBe(200);
            expect(response.body.data.displayName).toBe("João");
        });

        it("deve retornar erro se usuário não for encontrado", async () => {
            auth.getUser.mockRejectedValueOnce(new Error("auth/user-not-found"));

            const response = await request(app).get("/api/auth/user/invalido");

            expect(response.statusCode).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.errorMessage).toBe("Erro ao buscar o usuário.");
        });
    });
    
});
