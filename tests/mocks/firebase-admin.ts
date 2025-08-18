const firestoreMock = {
  collection: jest.fn().mockReturnThis(),
  add: jest.fn(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  get: jest.fn(),
  count: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  update: jest.fn(),
  batch: jest.fn().mockReturnThis(),
  commit: jest.fn(),
};

const authMock = {
  getUser: jest.fn(),
};

export const firestore = jest.fn(() => firestoreMock);
export const auth = jest.fn(() => authMock);

export const initializeApp = jest.fn();

export default {
  firestore,
  auth,
};