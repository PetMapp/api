import RequestService from "../src/services/RequestService";
import FirebaseService from "../src/services/FirebaseService";
import * as admin from "firebase-admin";
import request from "../src/models/entities/request";

jest.mock("../src/services/FirebaseService");
jest.mock("firebase-admin", () => ({
  firestore: jest.fn()
}));

type MockDoc = { id: string; data: () => Partial<request> };

describe("RequestService", () => {
  let requestService: RequestService;
  let countMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    requestService = new RequestService();

    countMock = { get: jest.fn() };

    const getMock = jest.fn();
    const orderByMock = jest.fn(() => ({ get: getMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock, get: getMock, where: jest.fn(() => ({ count: jest.fn(() => countMock) })) }));

    const collectionMock = jest.fn(() => ({ where: whereMock, orderBy: orderByMock, add: jest.fn(), doc: jest.fn() }));

    jest.spyOn(admin, "firestore").mockReturnValue({ collection: collectionMock } as any);
  });

  it("deve criar um request", async () => {
    const fakeRequest: request = {
      id: "req1",
      userId: "user1",
      petId: "pet1",
      userPetId: "owner1",
      message: "Acho que encontrei seu pet",
      status: "pending",
      createdAt: new Date().toISOString(),
      imageUrl: null
    };

    (FirebaseService.prototype.register as jest.Mock).mockResolvedValue(fakeRequest);

    const result = await requestService.createRequest(fakeRequest);
    expect(result).toEqual(fakeRequest);
  });

  it("deve listar requests por usuário", async () => {
    const mockDocs: MockDoc[] = [
      { id: "req1", data: () => ({ userId: "user1", petId: "pet1", userPetId: "owner1", status: "pending", createdAt: "2025-08-15", imageUrl: null }) }
    ];

    (admin.firestore().collection("requests").where as jest.Mock)().orderBy().get.mockResolvedValue({ docs: mockDocs });

    const result = await requestService.getRequestsByUser("user1");
    expect(result[0].id).toBe("req1");
  });

  it("deve atualizar status de um request para accepted", async () => {
    const existingRequest: request = {
      id: "req1",
      userId: "user1",
      petId: "pet1",
      userPetId: "owner1",
      message: "Encontrei seu pet",
      status: "pending",
      createdAt: "2025-08-15",
      imageUrl: null
    };

    (FirebaseService.prototype.get as jest.Mock).mockResolvedValue(existingRequest);
    (FirebaseService.prototype.update as jest.Mock).mockResolvedValue({ ...existingRequest, status: "accepted" });

    const result = await requestService.updateRequestStatus("req1", "accepted");
    expect(result?.status).toBe("accepted");
  });

  it("deve contar requests por status", async () => {
    countMock.get.mockResolvedValue({ data: () => ({ count: 2 }) });

    const result = await requestService.countRequestsByStatus("user1", "pending");
    expect(result).toBe(2);
  });

  it("cenário: aceitar um request significa que o pet foi achado", async () => {
    const requestData: request = {
      id: "req3",
      userId: "user2",
      petId: "pet1",
      userPetId: "owner1",
      message: "Vi seu pet no parque",
      status: "pending",
      createdAt: "2025-08-15",
      imageUrl: null
    };

    (FirebaseService.prototype.get as jest.Mock).mockResolvedValue(requestData);
    (FirebaseService.prototype.update as jest.Mock).mockResolvedValue({ ...requestData, status: "accepted" });

    const updated = await requestService.updateRequestStatus("req3", "accepted");
    expect(updated?.status).toBe("accepted");
    expect(updated?.status === "accepted").toBe(true);
  });
});