import { describe, expect, it } from "vitest";

import { PLATFORMS, platformLabel } from "./riot";

describe("platformLabel", () => {
  it("vrne ime platforme, ki ga poznajo igralci", () => {
    expect(platformLabel("eun1")).toBe("EUNE");
    expect(platformLabel("euw1")).toBe("EUW");
    expect(platformLabel("la2")).toBe("LAS");
  });

  it("za neznano platformo vrne ID z velikimi črkami", () => {
    expect(platformLabel("oc1")).toBe("OC1");
  });

  it("vsaka platforma ima edinstven ID", () => {
    const ids = PLATFORMS.map((platform) => platform.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
