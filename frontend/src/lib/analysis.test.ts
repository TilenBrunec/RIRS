import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ANALYSIS_STEPS,
  championIconUrl,
  fetchMatchup,
  fetchRecommendation,
  itemIconUrl,
  stepState,
} from "./analysis";

const [capturing, profiling, recommending] = ANALYSIS_STEPS;

describe("stepState (US-02, napredek analize)", () => {
  it("na začetku so vsi koraki v čakanju", () => {
    expect(ANALYSIS_STEPS.map((step) => stepState(step, "pending"))).toEqual([
      "waiting",
      "waiting",
      "waiting",
    ]);
  });

  it("med profiliranjem je zajem končan, priporočila čakajo", () => {
    expect(stepState(capturing, "profiling")).toBe("done");
    expect(stepState(profiling, "profiling")).toBe("active");
    expect(stepState(recommending, "profiling")).toBe("waiting");
  });

  it("po zaključku so vsi koraki končani", () => {
    for (const step of ANALYSIS_STEPS) expect(stepState(step, "completed")).toBe("done");
  });

  it("če igralec ni v tekmi, se analiza ustavi pri zajemu", () => {
    expect(stepState(capturing, "not_in_game")).toBe("stopped");
    expect(stepState(profiling, "not_in_game")).toBe("waiting");
    expect(stepState(capturing, "failed")).toBe("stopped");
  });
});

describe("URL-ji slik Data Dragon", () => {
  it("sestavi URL ikone predmeta in šampiona", () => {
    expect(itemIconUrl("16.22.1", 3036)).toBe(
      "https://ddragon.leagueoflegends.com/cdn/16.22.1/img/item/3036.png",
    );
    expect(championIconUrl("16.22.1", "Jinx")).toBe(
      "https://ddragon.leagueoflegends.com/cdn/16.22.1/img/champion/Jinx.png",
    );
  });
});

describe("klici API analize", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch() {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("fetchMatchup pošlje izbranega nasprotnika kot parameter", async () => {
    const fetchMock = stubFetch();
    await fetchMatchup("abc-1", 412);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/analyses\/abc-1\/matchup\?opponent=412$/);
  });

  it("fetchRecommendation pošlje stanje igre in zakodira ID", async () => {
    const fetchMock = stubFetch();
    await fetchRecommendation("a/b", "behind");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/analyses\/a%2Fb\/recommendation\?state=behind$/);
  });
});
