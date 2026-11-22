# 07 – Pregled prevzetega projekta

Pregled projekta **RIFT_HELP** ob prevzemu (stanje `main` na commitu `66cec9b`, PR #102).
Aplikacija je bila zagnana lokalno po navodilih iz README (`docker compose up -d --build`, uvoz
Data Dragon in zbiralnik tekem v načinu `RIOT_API_MODE=fixtures`). Preizkušen je bil celoten tok
analize za gosta (`Luka#EUNE`, EUNE), povezava Riot računa ter backend testi (`uv run pytest`,
z bazo PostgreSQL: 338 uspešnih) in linterja (Ruff, ESLint – brez napak).

## Implementirane funkcionalnosti MVP

| ID | Funkcionalnost | Stanje | Opomba |
|---|---|---|---|
| F01 | Registracija, prijava, povezava Riot računa | ✅ | JWT + osvežilni piškotek, Argon2id, verifikacija z ikono; v načinu `fixtures` gumb *Simuliraj zamenjavo ikone*. |
| F02 | Zaznava aktivne tekme | ✅ | `POST /analyses` → Celery → 10 udeležencev, napredek prek SSE. |
| F03 | Profil nasprotne sestave | ✅ | Delež fizične/magične škode, do 5 groženj s šampioni. |
| F04 | Priporočilo builda in run (ML) | ⚠️ delno | LightGBM model, učenje, SHAP razlogi in aktivacija so implementirani, a model se uporabi šele pri ≥ 20 tekmah šampiona. Z razpoložljivimi podatki (fixtures, nekaj tekem) se vedno uporabijo **pravila**. |
| F05 | Matchup kartica | ✅ | Časovnica moči 1–18, okna, nevarne sposobnosti, nasveti, ročna izbira nasprotnika. |
| F06 | Profil igralnega sloga | ⚠️ delno | Kazalniki proti mediani vloge in oznaka nizkega zaupanja sta implementirana; arhetip (GMM) zahteva model, naučen na ≥ 50 igralcih. V načinu `fixtures` je profil prazen, ker nasprotniki nimajo tekem. |
| F07 | Zbiranje tekem in učni cevovod | ✅ | Zbiralnik (`collector_runs`), učenje z metrikami AUC/log loss, aktivacija samo boljšega modela, stran za administratorja `/admin/modeli`. Dnevni zagon je samo na zahtevo (profil `beat`). |

Izven MVP so delno narejeni še **F15** (seznam *Moje analize* z brisanjem) in del **F14** (uvoz
patcha prek ukazne vrstice). F08–F13 niso implementirani, kar je skladno z obsegom MVP.

## Ali implementacija zadošča uporabniškim zgodbam

Pregledanih je 5 uporabniških zgodb MVP (US-01 do US-05); za popolnost sta dodani še US-06 in US-07.

### US-01 – Povezava Riot računa ✅

- Naključna ikona in odštevanje 10 minut (`VERIFICATION_TIME = 10 min`, odštevalnik na `/profil`). ✅
- "Preveri" verificira račun in ga prikaže v profilu. ✅
- Napačna ikona → "Ikona na računu še ni zamenjana", ponovni poskus dokler čas ne poteče. ✅
- Neobstoječ Riot ID → "Igralca s tem Riot ID ni v regiji X". ✅
- Račun, verificiran pri drugem uporabniku → 409 "Ta Riot račun je že povezan z drugim uporabnikom." ✅

### US-02 – Analiza aktivne tekme (gost) ✅

- 10 udeležencev s šampioni; v lokalnem preizkusu je analiza končana v nekaj sekundah. ✅
- Napredek po korakih (zajem, profiliranje, priporočila) prek SSE brez osveževanja. ✅
- Igralec ni v tekmi → "Igralec trenutno ni v tekmi" in gumb "Poskusi znova". ✅
- Četrta analiza gosta z istega IP v dnevu → 429 in povabilo k registraciji. ✅
- Odstopanje od 02-funkcionalnosti: prijavljeni uporabniki nimajo omejitve (načrtovanih je bilo 30 na dan).

### US-03 – Profil nasprotne sestave ✅

- Delež škode v odstotkih (npr. fizična 80 %, magična 20 %, skupaj 100 %). ✅
- Največ 5 groženj, razvrščenih po moči. ✅
- Pri vsaki grožnji so našteti šampioni (npr. "Engage: Leona, Malphite, Vi"). ✅

### US-04 – Priporočilo builda in run ⚠️

- 3 variante (standardna, varna, agresivna), ki se razlikujejo v predmetih. ✅
- Vsaka varianta ima rune, 4 dokončane predmete in vrstni red sposobnosti. ✅
- Vsak predmet ima razlog, ki omenja nasprotno sestavo ("… tankovskih nasprotnikov (Leona, Malphite)"). ✅
- Oznaka "Priporočilo na podlagi pravil", kadar ni modela. ✅
- Zgodba zahteva priporočilo **z modelom**: koda je pripravljena, a brez več tisoč zbranih tekem
  (pravi Riot ključ) model ni aktiviran, zato je v praksi vedno uporabljeno pravilo.

### US-05 – Matchup kartica ✅

- Časovnica od levela 1 do 18 za oba šampiona z okni prednosti in zaostanka. ✅
- Nevarne sposobnosti in 2–3 nasveti za linijsko fazo. ✅
- Če linijskega nasprotnika ni mogoče določiti, ga igralec izbere med petimi nasprotniki
  (`GET /analyses/{id}/matchup?opponent=`). ✅

### US-06 – Profil igralnega sloga ⚠️

- Število tekem (največ 20), oznaka "nizko zaupanje" pod 5 tekmami, 5 kazalnikov proti mediani. ✅
- Arhetip je prikazan šele, ko obstaja naučen GMM model. ⚠️
- "Profil ni javen" ni implementiran – možnosti skritja profila (opt-out) ni. ❌

### US-07 – Učni cevovod ⚠️

- Metrike (AUC, log loss), status "naučen", aktivacija samo boljšega modela, prejšnji "umaknjen". ✅
- Zapis zagona (čas, število novih tekem, izid) v `collector_runs`. ✅
- Samodejni dnevni zagon obstaja (Celery beat), a je privzeto izklopljen; učenje modela se ne
  sproži samodejno po zbiranju. ⚠️

## Ugotovitve ob prevzemu

- **Gradnja v svežem klonu ni uspela:** `frontend/Dockerfile` kopira mapo `public/`, ki v
  repozitoriju ne obstaja (prazne mape git ne shranjuje). Popravljeno z `frontend/public/.gitkeep`.
- **Frontend ni imel testov** (v 04-arhitektura je predviden Vitest); dodani v okviru CI/CD.
- Backend je dobro pokrit s testi (pokritost ≈ 88 %), testi baze se izvedejo samo z
  `TEST_DATABASE_URL`.
- Osvežilni piškotek je imel fiksno `SameSite=Lax`, kar ne deluje, kadar sta frontend in API na
  različnih domenah (produkcija). Dodana nastavitev `COOKIE_SAMESITE`.
- Dokumentacija (README, ADR 0001–0008, podatkovni model) je obsežna in ažurna; v
  04-arhitektura sta omenjena TanStack Query in Recharts, ki v kodi nista uporabljena.
