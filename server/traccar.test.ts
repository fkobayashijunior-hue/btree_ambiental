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
      },
    });

    expect(res.ok).toBe(true);
    const devices = await res.json();
    expect(Array.isArray(devices)).toBe(true);
    // Deve ter pelo menos o dispositivo de teste "Michigan 75 iii"
    expect(devices.length).toBeGreaterThanOrEqual(1);
    
    const michigan = devices.find((d: any) => d.name === "Michigan 75 iii");
    expect(michigan).toBeTruthy();
    expect(michigan.uniqueId).toBe("868018074043285");
  }, 15000);
});
