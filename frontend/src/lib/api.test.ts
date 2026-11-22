import { afterEach, describe, expect, it, vi } from "vitest";

import { API_URL, ApiError, apiGet, apiRequest } from "./api";

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("vrne JSON telo uspešnega odgovora", async () => {
    stubFetch(json({ status: "ok" }));
    await expect(apiGet("/health")).resolves.toEqual({ status: "ok" });
  });

  it("pošlje JSON telo, žeton in piškotke", async () => {
    const fetchMock = stubFetch(json({}));
    await apiRequest("/analyses", { method: "POST", body: { riot_id: "Luka#EUNE" }, token: "t0k" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/analyses`);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer t0k",
    });
    expect(JSON.parse(init.body)).toEqual({ riot_id: "Luka#EUNE" });
  });

  it("brez telesa ne nastavi Content-Type", async () => {
    const fetchMock = stubFetch(json({}));
    await apiGet("/auth/me");
    expect(fetchMock.mock.calls[0][1].headers).toEqual({});
  });

  it("pri 204 vrne undefined", async () => {
    stubFetch(new Response(null, { status: 204 }));
    await expect(apiRequest("/analyses/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("pri napaki vrže ApiError s sporočilom iz polja detail", async () => {
    stubFetch(json({ detail: "Analiza ne obstaja." }, 404));
    const error = await apiGet("/analyses/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: "Analiza ne obstaja." });
  });

  it("združi napake validacije FastAPI brez predpone 'Value error'", async () => {
    stubFetch(
      json(
        {
          detail: [
            { msg: "Value error, Riot ID mora biti v obliki ime#oznaka." },
            { msg: "Field required" },
          ],
        },
        422,
      ),
    );
    await expect(apiGet("/x")).rejects.toThrow("Riot ID mora biti v obliki ime#oznaka. Field required");
  });

  it("brez berljivega telesa uporabi privzeto sporočilo s statusom", async () => {
    stubFetch(new Response("ni json", { status: 500 }));
    await expect(apiGet("/x")).rejects.toThrow("Zahteva ni uspela (500).");
  });
});
