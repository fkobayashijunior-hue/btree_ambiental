import { describe, it, expect } from "vitest";

/**
 * Tests for the weekly closing logic and client portal Fechamentos tab
 */

describe("Weekly Closing Logic", () => {
  // Test the getWeekStart calculation
  it("should calculate correct week start (Monday) for any date", () => {
    const getWeekStart = (d: Date) => {
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    // Wednesday May 13, 2026 → Monday May 11, 2026
    const wed = new Date(2026, 4, 13); // May 13
    const mondayFromWed = getWeekStart(wed);
    expect(mondayFromWed.getDay()).toBe(1); // Monday
    expect(mondayFromWed.getDate()).toBe(11);
    expect(mondayFromWed.getMonth()).toBe(4); // May

    // Sunday May 10, 2026 → Monday May 4, 2026
    const sun = new Date(2026, 4, 10); // May 10
    const mondayFromSun = getWeekStart(sun);
    expect(mondayFromSun.getDay()).toBe(1); // Monday
    expect(mondayFromSun.getDate()).toBe(4);

    // Monday May 11, 2026 → Monday May 11, 2026 (same day)
    const mon = new Date(2026, 4, 11); // May 11
    const mondayFromMon = getWeekStart(mon);
    expect(mondayFromMon.getDay()).toBe(1);
    expect(mondayFromMon.getDate()).toBe(11);

    // Friday May 15, 2026 → Monday May 11, 2026
    const fri = new Date(2026, 4, 15); // May 15
    const mondayFromFri = getWeekStart(fri);
    expect(mondayFromFri.getDay()).toBe(1);
    expect(mondayFromFri.getDate()).toBe(11);
  });

  it("should calculate week end as Sunday (6 days after Monday)", () => {
    const getWeekStart = (d: Date) => {
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const today = new Date(2026, 4, 13); // May 13
    const weekStart = getWeekStart(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    expect(weekEnd.getDay()).toBe(0); // Sunday
    expect(weekEnd.getDate()).toBe(17); // May 17
  });

  it("should filter loads correctly for current week", () => {
    const getWeekStart = (d: Date) => {
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const today = new Date(2026, 4, 13);
    const thisWeekStart = getWeekStart(today);
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
    thisWeekEnd.setHours(23, 59, 59, 999);

    const loads = [
      { date: "2026-05-11T10:00:00", weightNetKg: "16000" }, // Monday - in week
      { date: "2026-05-13T08:00:00", weightNetKg: "17000" }, // Wednesday - in week
      { date: "2026-05-17T15:00:00", weightNetKg: "15000" }, // Sunday - in week
      { date: "2026-05-18T10:00:00", weightNetKg: "16500" }, // Monday next week - out
      { date: "2026-05-10T10:00:00", weightNetKg: "16200" }, // Sunday last week - out
    ];

    const thisWeekLoads = loads.filter((c) => {
      const d = new Date(c.date);
      return d >= thisWeekStart && d <= thisWeekEnd;
    });

    expect(thisWeekLoads.length).toBe(3);
    expect(thisWeekLoads[0].date).toBe("2026-05-11T10:00:00");
    expect(thisWeekLoads[1].date).toBe("2026-05-13T08:00:00");
    expect(thisWeekLoads[2].date).toBe("2026-05-17T15:00:00");
  });

  it("should calculate total weight and value correctly", () => {
    const loads = [
      { weightNetKg: "16000" },
      { weightNetKg: "17000" },
      { weightNetKg: "15000" },
    ];
    const pricePerTon = 130;

    const totalWeight = loads.reduce((acc, c) => acc + parseFloat(c.weightNetKg || '0'), 0);
    const totalWeightTon = totalWeight / 1000;
    const totalValue = totalWeightTon * pricePerTon;

    expect(totalWeight).toBe(48000);
    expect(totalWeightTon).toBe(48);
    expect(totalValue).toBe(6240);
  });

  it("should calculate due date correctly (payment term days after week end)", () => {
    const weekEnd = new Date(2026, 4, 17); // May 17 (Sunday)
    const paymentTermDays = 20;
    const dueDate = new Date(weekEnd);
    dueDate.setDate(dueDate.getDate() + paymentTermDays);

    expect(dueDate.getDate()).toBe(6); // June 6
    expect(dueDate.getMonth()).toBe(5); // June (0-indexed)
  });

  it("should detect overdue closings correctly", () => {
    const closing = {
      status: 'fechado',
      dueDate: '2026-05-09T00:00:00', // May 9 - past
    };

    const isOverdue = closing.status === 'fechado' && closing.dueDate && new Date(closing.dueDate) < new Date(2026, 4, 13);
    expect(isOverdue).toBe(true);

    const closingNotOverdue = {
      status: 'fechado',
      dueDate: '2026-06-01T00:00:00', // June 1 - future
    };

    const isOverdue2 = closingNotOverdue.status === 'fechado' && closingNotOverdue.dueDate && new Date(closingNotOverdue.dueDate) < new Date(2026, 4, 13);
    expect(isOverdue2).toBe(false);

    // Paid closing should not be considered overdue
    const closingPaid = {
      status: 'pago',
      dueDate: '2026-05-01T00:00:00', // Past but paid
    };

    const isOverdue3 = closingPaid.status === 'fechado' && closingPaid.dueDate && new Date(closingPaid.dueDate) < new Date(2026, 4, 13);
    expect(isOverdue3).toBe(false);
  });

  it("should correctly identify last week closing from formal closings", () => {
    const getWeekStart = (d: Date) => {
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const today = new Date(2026, 4, 13);
    const thisWeekStart = getWeekStart(today);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekKey = lastWeekStart.toISOString().slice(0, 10);

    expect(lastWeekKey).toBe("2026-05-04");

    const formalClosings = [
      { id: 1, weekStart: "2026-04-28T00:00:00", status: "fechado" },
      { id: 2, weekStart: "2026-05-04T00:00:00", status: "pago" },
    ];

    const lastWeekClosing = formalClosings.find((c) => {
      if (!c.weekStart) return false;
      return new Date(c.weekStart).toISOString().slice(0, 10) === lastWeekKey;
    });

    expect(lastWeekClosing).toBeDefined();
    expect(lastWeekClosing!.id).toBe(2);
    expect(lastWeekClosing!.status).toBe("pago");
  });

  it("should format currency correctly for display", () => {
    const formatCurrency = (v: string | number | null) => {
      if (!v && v !== 0) return "—";
      const num = typeof v === 'number' ? v : parseFloat(v);
      if (isNaN(num)) return String(v);
      return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    };

    expect(formatCurrency(10985)).toBe("R$\u00a010.985,00");
    expect(formatCurrency("3653.00")).toBe("R$\u00a03.653,00");
    expect(formatCurrency(0)).toBe("R$\u00a00,00");
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency("")).toBe("—");
  });

  it("should calculate cron schedule for next Friday at 22h", () => {
    // Simulate the cron scheduling logic
    const now = new Date(2026, 4, 13, 15, 0, 0); // Wednesday May 13, 3pm
    const next = new Date(now);
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    
    // Today is Wednesday (3), Friday is (5), so daysUntilFriday = 2
    expect(daysUntilFriday).toBe(2);
    
    if (now.getDay() === 5 && now.getHours() >= 22) {
      next.setDate(now.getDate() + 7);
    } else if (now.getDay() === 5 && now.getHours() < 22) {
      next.setDate(now.getDate());
    } else {
      next.setDate(now.getDate() + daysUntilFriday);
    }
    next.setHours(22, 0, 0, 0);

    expect(next.getDate()).toBe(15); // Friday May 15
    expect(next.getHours()).toBe(22);
    expect(next.getDay()).toBe(5); // Friday
  });

  it("should handle Friday after 22h by scheduling next week", () => {
    const now = new Date(2026, 4, 15, 23, 0, 0); // Friday May 15, 11pm
    const next = new Date(now);
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    
    if (now.getDay() === 5 && now.getHours() >= 22) {
      next.setDate(now.getDate() + 7);
    } else if (now.getDay() === 5 && now.getHours() < 22) {
      next.setDate(now.getDate());
    } else {
      next.setDate(now.getDate() + daysUntilFriday);
    }
    next.setHours(22, 0, 0, 0);

    expect(next.getDate()).toBe(22); // Next Friday May 22
    expect(next.getDay()).toBe(5); // Friday
  });
});
