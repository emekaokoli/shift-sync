import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./index";

describe("Health Check API", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  it("should return health status", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("timestamp");
  });

  it("should return 404 for unknown routes", async () => {
    const response = await request(app).get("/unknown-route").expect(404);

    expect(response.body).toHaveProperty("error");
  });
});

describe("API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  it("should have shifts route", async () => {
    const response = await request(app).get("/api/shifts").expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should have staff route", async () => {
    const response = await request(app).get("/api/staff").expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should have locations route", async () => {
    const response = await request(app).get("/api/locations").expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should have skills route", async () => {
    const response = await request(app).get("/api/skills").expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
