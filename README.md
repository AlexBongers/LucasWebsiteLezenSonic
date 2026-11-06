# Lucas' Turbo Missie

Een tablet-website waarmee Lucas (5,5 jaar, niveau tussen groep 2 en groep 3) spelenderwijs oefent met **letters, woordjes lezen en rekenen**, samen met de blauwe egel en zijn vrienden. Zie [PLAN.md](PLAN.md) voor het volledige plan.

Het is een zusje van [Lana's Gouden Missie](https://github.com/AlexBongers/LanaWebsiteLezenRekenen) en gebruikt dezelfde techniek (Vite, Svelte 5, TypeScript, PWA), maar is voor een kleuter en een jongen gemaakt: veel luisteren, grote knoppen, geen schrijven, en spellen met katapulten, ontploffingen en bouwen.

## Wat zit er in (fase 0, 1 en 2)

Na het kiezen van een held kiest Lucas een spel. De snelle spellen staan bovenaan.

| Held | Spel | Wat oefent het |
|---|---|---|
| **Sonic** | ⚡ Ring-race | Een letter flitst in een gouden ring. Welke zag je? De flitstijd wordt korter als het goed gaat. |
| | 🏁 Woord-race | Een woordje flitst (kat, vis, maan). Kies het plaatje dat erbij hoort. |
| **Tails** | 🎯 Katapult-sommen | Een som met ringen. Schiet de robot met het goede antwoord weg met de katapult. Plus tot 5, tot 10, min, door elkaar, tot 20. |
| | 🏗️ Tel & Bouw | Bouw een toren van n stenen en laat hem ontploffen. Of tel hoeveel stenen er staan. Elke steen wordt hardop geteld. |
| **Knuckles** | 💥 Letter-smash | De stem zegt een woord. Sla de steen met de beginletter kapot. |
| | 🧱 Woord-bouwen | Er staat een plaatje. Leg het woordje met letterstenen in de goede volgorde. |

Verder:
- **Alles wordt voorgelezen** door een Nederlandse jongensstem (ElevenLabs, Milan). Er is geen tabletstem nodig; de teksten zijn vooraf ingesproken en werken offline.
- **Proefrondje:** elk spel begint met 8 opgaven die steeds moeilijker worden. Daarmee kiest de site het startniveau.
- **Niveau per spel.** Rekenen gaat pas een stapje omhoog bij 9 van de 10 goed. Er zijn nooit moeilijkere opgaven dan zijn niveau, wel extra makkelijke.
- **Herhalingsdoosjes:** wat niet meteen goed ging, komt later terug (volgende keer, na 1, 3, 7 en 14 dagen).
- **Hint bij een fout, antwoord bij de tweede fout.** Nooit een straf: de opgave komt later terug.
- **Gouden ringen** vliegen naar de teller, met "3 op rij!"-combo's en ontploffingen.
- **Rustmoment** na 10 minuten (instelbaar).
- **Ouderhoek** (houd het slotje linksboven 3 seconden vast en los de keersom op): niveau per spel, overzicht van wat lastig is (bijv. b en d), herhalingsdoosjes, instellingen, proefstemmen en back-up.
- **De letters die Lucas kent bepaal jij** in de ouderhoek. De spellen gebruiken alleen die letters en alleen woordjes die hij daarmee kan lezen. Standaard staan de eerste twaalf letters aan (m r v s a i e o k p t n).
- Werkt offline, schaalt mee met elk scherm (ontworpen voor 1280 × 800, zoals de Galaxy Tab A9+) en heeft een rode Stoppen-knop.

De figuren zijn **eigen tekeningen**, geïnspireerd op de blauwe egel en zijn vrienden uit de videogames. Er worden geen officiële afbeeldingen, muziek of geluiden gebruikt. Deze site is bedoeld voor privégebruik.

## Voor ontwikkelaars

```bash
npm install
npm run dev        # ontwikkelserver (ook bereikbaar op het netwerk, handig om op de tablet te testen)
npm test           # tests van de generatoren, de planner en de stemlijst
npm run check      # type-controle
npm run build      # productieversie in dist/
```

### Inhoud aanpassen
Alles staat in `content/`:
- `letters.json`: letters met een beginwoord en plaatje, lange klanken, en welke letters op elkaar lijken.
- `woorden.json`: woordjes met een plaatje (elk plaatje maar één keer).
- `teksten.json`: alle instructies en complimenten.
- `characters.json`: namen en kleuren van de helden.
- `stem.json`: stem, tempo en proefstemmen.

Draai na een wijziging `npm test` en `npm run audio` (spreekt alleen nieuwe teksten in).

### De stem
Eenmalig per computer: `npx -y @elevenlabs/cli@latest onboard init` (logt in en zet de sleutel in `.env.local`, die niet naar GitHub gaat).

| Opdracht | Wat het doet |
|---|---|
| `npm run audio:proef` | Laat zien hoeveel tekens er ingesproken moeten worden (kost niets). |
| `npm run audio` | Spreekt alle ontbrekende teksten in en ruimt oude opnames op. |
| `npm run audio -- --proef` | Maakt proefstemmen (Milan, Koen, Jaimie, Sebastiaan) voor de ouderhoek. |
| `npm run audio -- --opnieuw` | Spreekt alles opnieuw in (na een tempowijziging, verhoog dan `versie` in `stem.json`). |
| `npm run audio -- --stemmen` | Zoekt Nederlandse vrouwenstemmen in de ElevenLabs-bibliotheek. Pas het filter in het script aan voor mannen. |

Alles inspreken kost ongeveer 1.800 tekens. Een test bewaakt dat elke tekst, elk woord en elk getal tot 20 dat de app kan zeggen een opname heeft.

### Online zetten (Cloudflare)
De app draait als Cloudflare Worker met Static Assets (`wrangler.jsonc`). Eenmalig `npx wrangler login`, daarna `npm run deploy`. Op de tablet: open het adres in Chrome en kies "App installeren". **Dit project is nog niet online gezet.**

### Opbouw
```
src/app/      schermen: start, heldenkeuze, spelkeuze, ronde (Level), beloning, ouderhoek
src/art/      Held (Sonic, Tails, Knuckles) en Robot
src/engine/   letters en woorden, sommen, niveau, doosjes, planning
src/games/    de zes spellen en hun gemeenschappelijke regels (Ronde)
src/audio/    stem en geluidseffecten
src/store/    voortgang op de tablet
```
