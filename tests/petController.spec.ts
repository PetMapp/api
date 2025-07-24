import app from "../src";
import request from "supertest";
import FirebaseService from "../src/services/FirebaseService";
import pet from "../src/models/entities/pet";
import { DecodedIdToken } from "firebase-admin/auth";
import petLocation from "../src/models/entities/petLocation";
import path from "path";
import fs from "fs";
import axios from "axios";
import { getDistanceFromLatLonInKm } from "../src/utils/distance";

jest.mock('../src/middleware/authorize', () => {
    return jest.fn((req, res, next) => {
        req.user = {
            uid: 'usuario123',
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

jest.mock('../src/services/GoogleService', () => {
    return jest.fn().mockImplementation(() => ({
        Geocode: {
            GetByAddress: jest.fn().mockResolvedValue({
                results: [{
                    geometry: {
                        location: {
                            lat: -23.5,
                            lng: -46.6
                        }
                    }
                }]
            })
        }
    }));
});

jest.mock('../src/services/FirebaseService');
const MockFirebaseService = FirebaseService as jest.MockedClass<typeof FirebaseService>;

describe('GET /api/pet/myPets', () => {
    it('deve retornar os pets do usuário logado', async () => {
        MockFirebaseService.prototype.list.mockResolvedValue([
            { id: '1', userId: 'usuario123', apelido: 'Rex', localizacao: '', descricao: '', status: '', coleira: false, createdAt: '' },
            { id: '2', userId: 'usuario123', apelido: 'Luna', localizacao: '', descricao: '', status: '', coleira: false, createdAt: '' },
        ] as pet[]);

        const response = await request(app)
            .get('/api/pet/myPets')
            .set('Authorization', 'Bearer tokenFakeQueTemUsuario123');

        expect(response.statusCode).toBe(200);
        expect(response.body.data.list.length).toBe(2);
    });
});

describe('GET /api/pet/location/all', () => {
    it('deve retornar todas as localizações de pets', async () => {
        MockFirebaseService.prototype.list.mockResolvedValue([
            { lat: -23.5505, lng: -46.6333, petId: '1' },
            { lat: -22.9068, lng: -43.1729, petId: '2' },
        ] as petLocation[]);

        const response = await request(app)
            .get('/api/pet/location/all')
            .set('Authorization', 'Bearer tokenFake');

        expect(response.statusCode).toBe(200);
        expect(response.body.data.length).toBe(2);
    });
});

describe('PUT /api/pet/find/update', () => {
    it('deve atualizar informações do pet', async () => {
        MockFirebaseService.prototype.get.mockResolvedValueOnce({
            id: '1',
            userId: 'usuario123',
            apelido: 'Rex',
            localizacao: 'Rua A',
            descricao: 'Pet fofo',
            status: 'Perdido',
            coleira: true,
            createdAt: new Date().toISOString()
        } as pet);

        MockFirebaseService.prototype.find.mockResolvedValue({
            id: 'petLocationId123',
            lat: -23.5,
            lng: -46.6,
            petId: '1'
        } as petLocation);

        const response = await request(app)
            .put('/api/pet/find/update')
            .send({
                petId: '1',
                descricao: 'Atualizado',
                localicacao: 'Rua A',
                status: 'Perdido'
            })
            .set('Authorization', 'Bearer tokenFake');

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it('não deve atualizar informações se o pet não for encontrado', async () => {
        MockFirebaseService.prototype.get.mockResolvedValueOnce(null);

        const response = await request(app)
            .put('/api/pet/find/update')
            .send({
                petId: '1',
                descricao: 'Atualizado',
                localicacao: 'Rua A',
                status: 'Perdido'
            })
            .set('Authorization', 'Bearer tokenFake');

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorMessage).toBe("Pet não encontrado.");
    });

    it('não deve permitir atualização se usuário não for dono do pet', async () => {
        MockFirebaseService.prototype.get.mockResolvedValueOnce({
            id: '1',
            userId: 'outroUsuario'
        } as pet);

        const response = await request(app)
            .put('/api/pet/find/update')
            .send({
                petId: '1',
                descricao: 'Atualizado',
                localicacao: 'Rua A',
                status: 'Perdido'
            })
            .set('Authorization', 'Bearer tokenFake');

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorMessage).toBe("Você não é o dono do pet para realizar alterações.");
    });
});

describe('POST /api/pet/find/register', () => {
    it('deve cadastrar um novo pet com imagem e localização', async () => {
        jest.spyOn(axios, 'get').mockResolvedValueOnce({
            data: [{ lat: "-23.5", lon: "-46.6" }]
        });

        MockFirebaseService.prototype.register
            .mockResolvedValueOnce({ id: "pet123" }) // pet
            .mockResolvedValueOnce({ id: "pet123" });

        const imagePath = path.resolve(__dirname, "mocks/pet.png");
        const imageBuffer = fs.readFileSync(imagePath);

        const response = await request(app)
            .post("/api/pet/find/register")
            .set("Authorization", "Bearer tokenFake")
            .attach("img", imageBuffer, "pet.png")
            .field("apelido", "Bolt")
            .field("descricao", "Rápido")
            .field("status", "Perdido")
            .field("coleira", "true")
            .field("localizacao", "Rua A");

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("Pet cadastrado com sucesso!");
    });

    it('deve cadastrar um novo pet marcado como perdido', async () => {
        jest.spyOn(axios, 'get').mockResolvedValueOnce({
            data: [{ lat: "-23.5", lon: "-46.6" }]
        });

        MockFirebaseService.prototype.register
            .mockResolvedValueOnce({ id: "pet123" })
            .mockResolvedValueOnce({ id: "loc123" });

        const imagePath = path.resolve(__dirname, "mocks/pet.png");
        const imageBuffer = fs.readFileSync(imagePath);

        const response = await request(app)
            .post("/api/pet/find/register")
            .set("Authorization", "Bearer tokenFake")
            .attach("img", imageBuffer, "pet.png")
            .field("apelido", "Max")
            .field("descricao", "Sumiu no parque")
            .field("status", "Perdido")
            .field("coleira", "false")
            .field("localizacao", "Praça Central")
            .field("isMissing", "true")
            .field("missingSince", "2025-07-01")
            .field("lastSeenLocation", "Rua das Árvores");

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("Pet cadastrado com sucesso!");

        expect(MockFirebaseService.prototype.register).toHaveBeenCalledWith(
            expect.stringContaining("pets"),
            expect.objectContaining({
                apelido: "Max",
                isMissing: true,
                missingSince: "2025-07-01",
                lastSeenLocation: "Rua das Árvores"
            })
        );
    });

    it('não deve cadastrar pet se faltar campo obrigatório', async () => {
        const response = await request(app)
            .post("/api/pet/find/register")
            .set("Authorization", "Bearer tokenFake")
            .field("apelido", "Bolt");

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
    });
});

// ROTA: GET /api/pet/find/get/:id
describe('GET /api/pet/find/get/:id', () => {
    it("deve retornar detalhes de um pet por ID", async () => {
        MockFirebaseService.prototype.get.mockResolvedValueOnce({
            id: "1",
            userId: "usuario123",
            apelido: "Tobby",
            descricao: "Bonitinho",
            localizacao: "Rua XPTO",
            coleira: false,
            createdAt: "2024-01-01T00:00:00Z"
        } as pet);

        MockFirebaseService.prototype.find.mockResolvedValueOnce({
            id: "loc1",
            petId: "1",
            lat: -23.5,
            lng: -46.6
        } as petLocation);

        const response = await request(app)
            .get("/api/pet/find/get/1");

        expect(response.statusCode).toBe(200);
        expect(response.body.data.apelido).toBe("Tobby");
    });
});

describe('DELETE /api/pet/find/remove', () => {
    it("deve remover um pet e sua localização", async () => {
        MockFirebaseService.prototype.get.mockResolvedValueOnce({
            id: "1",
            userId: "usuario123"
        } as pet);

        MockFirebaseService.prototype.find.mockResolvedValueOnce({
            id: "loc1",
            petId: "1"
        } as petLocation);

        MockFirebaseService.prototype.remove.mockResolvedValue(true);

        const response = await request(app)
            .delete("/api/pet/find/remove")
            .set("Authorization", "Bearer tokenFake")
            .send({ petId: "1" });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it("deve falhar ao tentar remover pet que não existe", async () => {
        MockFirebaseService.prototype.get.mockResolvedValueOnce(null);

        const response = await request(app)
            .delete("/api/pet/find/remove")
            .set("Authorization", "Bearer tokenFake")
            .send({ petId: "999" });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorMessage).toBe("Pet não encontrado.");
    });

    it("deve falhar ao remover pet de outro usuário", async () => {
        MockFirebaseService.prototype.get.mockResolvedValueOnce({
            id: "1",
            userId: "outroUsuario"
        } as pet);

        const response = await request(app)
            .delete("/api/pet/find/remove")
            .set("Authorization", "Bearer tokenFake")
            .send({ petId: "1" });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorMessage).toBe("você não é o dono do pet para realizar alterações.");
    });
});

describe('POST /api/pet/locateByLatLng', () => {
    it("deve retornar endereço pelo lat/lng", async () => {
        (axios.get as jest.Mock).mockResolvedValueOnce({
            data: {
                display_name: "Rua XPTO, São Paulo"
            }
        });

        const response = await request(app)
            .post("/api/pet/locateByLatLng")
            .set("Authorization", "Bearer tokenFake")
            .send({ lat: -23.5, lng: -46.6 });

        expect(response.statusCode).toBe(200);
        expect(response.body.data).toBe("Rua XPTO, São Paulo");
    });

    it("deve retornar erro se falhar ao buscar endereço por lat/lng", async () => {
        (axios.get as jest.Mock).mockRejectedValueOnce(new Error("Erro de rede"));

        const response = await request(app)
            .post("/api/pet/locateByLatLng")
            .set("Authorization", "Bearer tokenFake")
            .send({ lat: -23.5, lng: -46.6 });

        expect(response.statusCode).toBe(500);
        expect(response.body.success).toBe(false);
    });
});

describe('GET /api/pet/find/search', () => {
    it("deve buscar pets com base em texto", async () => {
        MockFirebaseService.prototype.list.mockResolvedValue([
            { id: "1", apelido: "Bolt", descricao: "rápido", localizacao: "Rua 1", userId: "usuario123", coleira: true, createdAt: "" },
            { id: "2", apelido: "Tobby", descricao: "calmo", localizacao: "Rua 2", userId: "usuario123", coleira: false, createdAt: "" },
        ] as pet[]);

        const response = await request(app)
            .get("/api/pet/find/search?query=bolt")
            .set("Authorization", "Bearer tokenFake");

        expect(response.statusCode).toBe(200);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].apelido).toBe("Bolt");
    });
});

describe('getDistanceFromLatLonInKm', () => {
    it('deve retornar 0 para mesma coordenada', () => {
        const distance = getDistanceFromLatLonInKm(-23.5505, -46.6333, -23.5505, -46.6333);
        expect(distance).toBeCloseTo(0, 5);
    });

    it('deve calcular distância entre São Paulo e Rio de Janeiro', () => {
        const spLat = -23.5505;
        const spLng = -46.6333;
        const rioLat = -22.9068;
        const rioLng = -43.1729;

        const distance = getDistanceFromLatLonInKm(spLat, spLng, rioLat, rioLng);

        // A distância real é cerca de 357 km
        expect(distance).toBeGreaterThan(350);
        expect(distance).toBeLessThan(370);
    });

    it('deve calcular corretamente entre dois pontos próximos (raio curto)', () => {
        const lat1 = -23.5500;
        const lng1 = -46.6300;
        const lat2 = -23.5510;
        const lng2 = -46.6310;

        const distance = getDistanceFromLatLonInKm(lat1, lng1, lat2, lng2);
        expect(distance).toBeGreaterThan(0);
        expect(distance).toBeLessThan(0.2);
    });
});

describe('GET /api/pet/petFinder/list', () => {
    it('deve retornar pets desaparecidos próximos ao usuário', async () => {
        // Mock da lista de pets
        MockFirebaseService.prototype.list
            .mockImplementationOnce(() => Promise.resolve([
                {
                    id: 'pet1',
                    userId: 'usuario456',
                    apelido: 'Rex',
                    descricao: 'Fugiu ontem',
                    localizacao: 'Rua 1',
                    isMissing: true,
                    createdAt: '',
                }
            ])) // 1ª chamada: pets
            .mockImplementationOnce(() => Promise.resolve([
                {
                    id: 'loc1',
                    petId: 'pet1',
                    lat: -23.5505,
                    lng: -46.6333,
                }
            ])); // 2ª chamada: petLocations

        // Mock do Firebase Storage
        const mockGetSignedUrl = jest.fn().mockResolvedValue(['https://storage.fake.url/pet1-thumb.jpg']);
        const mockFile = { getSignedUrl: mockGetSignedUrl };
        const mockBucket = { file: () => mockFile };
        jest.spyOn(require('firebase-admin').storage(), 'bucket').mockReturnValue(mockBucket as any);

        const response = await request(app)
            .get('/api/pet/petFinder/list')
            .set('Authorization', 'Bearer tokenFake')
            .query({
                lat: -23.5505,
                lng: -46.6333,
                radius: 10
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].apelido).toBe('Rex');
        expect(response.body.data[0].imageUrl).toContain('https://storage.fake.url');
    });

    it('deve retornar array vazio se não houver pets dentro do raio', async () => {
        MockFirebaseService.prototype.list
            .mockImplementationOnce(() => Promise.resolve([
                {
                    id: 'pet1',
                    userId: 'usuario456',
                    apelido: 'Rex',
                    descricao: 'Fugiu ontem',
                    localizacao: 'Rua 1',
                    isMissing: true,
                    createdAt: '',
                }
            ]))
            .mockImplementationOnce(() => Promise.resolve([
                {
                    id: 'loc1',
                    petId: 'pet1',
                    lat: -21.0, // longe do usuário
                    lng: -43.0,
                }
            ]));

        const response = await request(app)
            .get('/api/pet/petFinder/list')
            .set('Authorization', 'Bearer tokenFake')
            .query({
                lat: -23.5505,
                lng: -46.6333,
                radius: 1
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(0);
    });

    it('deve retornar erro se faltar lat/lng', async () => {
        const response = await request(app)
            .get('/api/pet/petFinder/list')
            .set('Authorization', 'Bearer tokenFake')
            .query({});

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorMessage).toBe("Latitude e longitude são obrigatórias.");
    });
});