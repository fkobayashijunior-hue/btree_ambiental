import { describe, it, expect } from "vitest";

describe("Traccar API Connection", () => {
  it("should connect to Traccar and list devices using token", async () => {
    const url = process.env.TRACCAR_URL;
    const token = process.env.TRACCAR_TOKEN;

    expect(url).toBeTruthy();
    expect(token).toBeTruthy();

    const res = await fetch(`${url}/api/devices`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    expect(res.ok).toBe(true);
    const devices = await res.json();
    expect(Array.isArray(devices)).toBe(true);
    expect(devices.length).toBeGreaterThanOrEqual(1);
  }, 15000);
});

describe("Traccar Trips API - Accept Header Fix", () => {
  it("should return JSON trips when Accept: application/json is set", async () => {
    const url = process.env.TRACCAR_URL;
    const token = process.env.TRACCAR_TOKEN;

    if (!url || !token) {
      console.log("Skipping: TRACCAR_URL or TRACCAR_TOKEN not set");
      return;
    }

    // Get devices first to find one that's online
    const devRes = await fetch(`${url}/api/devices`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const devices = await devRes.json();
    const onlineDevice = devices.find((d: any) => d.status === "online") || devices[0];

    if (!onlineDevice) {
      console.log("Skipping: no devices found");
      return;
    }

    // Request trips with Accept header (the fix)
    const from = "2026-04-01T00:00:00.000Z";
    const to = "2026-05-14T23:59:59.000Z";
    const tripRes = await fetch(
      `${url}/api/reports/trips?deviceId=${onlineDevice.id}&from=${from}&to=${to}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    expect(tripRes.ok).toBe(true);
    expect(tripRes.headers.get("content-type")).toContain("application/json");

    const trips = await tripRes.json();
    expect(Array.isArray(trips)).toBe(true);
    // Should have trips (we know Scania has 70+ in this period)
    expect(trips.length).toBeGreaterThan(0);

    // Verify trip structure
    const trip = trips[0];
    expect(trip).toHaveProperty("deviceId");
    expect(trip).toHaveProperty("distance");
    expect(trip).toHaveProperty("duration");
    expect(trip).toHaveProperty("startTime");
    expect(trip).toHaveProperty("endTime");
    expect(trip).toHaveProperty("averageSpeed");
    expect(trip).toHaveProperty("maxSpeed");
    expect(trip).toHaveProperty("startAddress");
  }, 30000);

  it("should NOT return JSON without Accept header (returns Excel/ZIP)", async () => {
    const url = process.env.TRACCAR_URL;
    const token = process.env.TRACCAR_TOKEN;

    if (!url || !token) {
      console.log("Skipping: TRACCAR_URL or TRACCAR_TOKEN not set");
      return;
    }

    const devRes = await fetch(`${url}/api/devices`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    const devices = await devRes.json();
    const device = devices.find((d: any) => d.status === "online") || devices[0];

    if (!device) return;

    // Request WITHOUT Accept header - should get non-JSON response
    const from = "2026-05-01T00:00:00.000Z";
    const to = "2026-05-14T23:59:59.000Z";
    const tripRes = await fetch(
      `${url}/api/reports/trips?deviceId=${device.id}&from=${from}&to=${to}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          // NO Accept header - this is the bug we fixed
        },
      }
    );

    expect(tripRes.ok).toBe(true);
    // Without Accept: application/json, Traccar returns Excel format
    const contentType = tripRes.headers.get("content-type") || "";
    // It should NOT be application/json (it's application/vnd.openxmlformats... or application/octet-stream)
    expect(contentType).not.toContain("application/json");
  }, 30000);

  it("trip data should have km and route info for freight cost verification", async () => {
    const url = process.env.TRACCAR_URL;
    const token = process.env.TRACCAR_TOKEN;

    if (!url || !token) return;

    // Get Scania trips (device 13)
    const from = "2026-05-01T00:00:00.000Z";
    const to = "2026-05-14T23:59:59.000Z";
    const tripRes = await fetch(
      `${url}/api/reports/trips?deviceId=13&from=${from}&to=${to}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const trips = await tripRes.json();
    expect(trips.length).toBeGreaterThan(0);

    // Verify we can calculate km for freight cost
    const totalKm = trips.reduce((sum: number, t: any) => sum + (t.distance || 0), 0) / 1000;
    expect(totalKm).toBeGreaterThanOrEqual(0);

    // Verify addresses are available for route verification
    const tripsWithAddress = trips.filter((t: any) => t.startAddress);
    expect(tripsWithAddress.length).toBeGreaterThan(0);
  }, 30000);
});
