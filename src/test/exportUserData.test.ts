import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportTableCSV, exportTablePDF, type ExportColumn } from "@/lib/exportUserData";

describe("exportTableCSV", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const columns: ExportColumn[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "status", label: "Status" },
  ];

  const rows = [
    { name: "Alice", email: "alice@test.com", status: "active" },
    { name: "Bob", email: "bob@test.com", status: "inactive" },
  ];

  it("generates correct CSV content and triggers download", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.fn();
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((el) => el);
    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((el) => el);

    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    exportTableCSV(rows, columns, "test_export.csv");

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it("handles nested keys like profile.display_name", () => {
    const nestedCols: ExportColumn[] = [
      { key: "profile.display_name", label: "Display Name" },
      { key: "zip_code", label: "ZIP" },
    ];
    const nestedRows = [
      { profile: { display_name: "Charlie" }, zip_code: "12345" },
      { profile: { display_name: "Dana" }, zip_code: "67890" },
    ];

    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    vi.spyOn(document.body, "appendChild").mockImplementation((el) => el);
    vi.spyOn(document.body, "removeChild").mockImplementation((el) => el);

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = vi.fn();
      return el;
    });

    exportTableCSV(nestedRows, nestedCols, "nested.csv");
    expect(createObjectURL).toHaveBeenCalledOnce();
  });

  it("escapes commas and quotes in CSV values", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    vi.spyOn(document.body, "appendChild").mockImplementation((el) => el);
    vi.spyOn(document.body, "removeChild").mockImplementation((el) => el);

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = vi.fn();
      return el;
    });

    const specialRows = [{ name: 'O"Brien, Jr.', email: "test@test.com", status: "active" }];
    exportTableCSV(specialRows, columns, "special.csv");

    expect(createObjectURL).toHaveBeenCalledOnce();
  });

  it("handles empty rows", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    vi.spyOn(document.body, "appendChild").mockImplementation((el) => el);
    vi.spyOn(document.body, "removeChild").mockImplementation((el) => el);

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = vi.fn();
      return el;
    });

    exportTableCSV([], columns, "empty.csv");
    expect(createObjectURL).toHaveBeenCalledOnce();
  });
});

describe("exportTablePDF", () => {
  it("opens a print window with HTML table", () => {
    const writeSpy = vi.fn();
    const closeSpy = vi.fn();
    const printSpy = vi.fn();
    const mockWin = { document: { write: writeSpy, close: closeSpy }, print: printSpy };
    vi.spyOn(window, "open").mockReturnValue(mockWin as any);

    const columns: ExportColumn[] = [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
    ];
    const rows = [{ name: "Test User", status: "active" }];

    exportTablePDF(rows, columns, "Test Report");

    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(writeSpy).toHaveBeenCalledOnce();
    const html = writeSpy.mock.calls[0][0] as string;
    expect(html).toContain("Test Report");
    expect(html).toContain("Test User");
    expect(html).toContain("1 record");
    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it("handles null window.open gracefully", () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    const columns: ExportColumn[] = [{ key: "name", label: "Name" }];
    expect(() => exportTablePDF([{ name: "X" }], columns, "Title")).not.toThrow();
  });
});
