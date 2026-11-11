# Lucas' Turbo Missie

**Spelen:** https://lucas-turbo-missie.exl999.workers.dev (op de tablet installeren: zie hieronder)

Een tablet-website waarmee Lucas (5,5 jaar, niveau tussen groep 2 en groep 3) spelenderwijs oefent met **letters, woordjes lezen en rekenen**, samen met de blauwe egel en zijn vrienden. Zie [PLAN.md](PLAN.md) voor het volledige plan.

Het is een zusje van [Lana's Gouden Missie](https://github.com/AlexBongers/LanaWebsiteLezenRekenen) en gebruikt dezelfde techniek (Vite, Svelte 5, TypeScript, PWA), maar is voor een kleuter en een jongen gemaakt: veel luisteren, grote knoppen, geen schrijven, en spellen met katapulten, ontploffingen en bouwen.

## Wat zit er in

Na het kiezen van een held kiest Lucas een spel (of de **Dagmissie**). De snelle spellen staan bovenaan.

| Held | Spel | Wat oefent het |
|---|---|---|
| **Sonic** | ⚡ Ring-race | Een letter flitst in een gouden ring. Welke zag je? De flitstijd wordt korter als het goed gaat. |
| | 🏁 Woord-race | Een woordje flitst (kat, vis, maan). Kies het plaatje dat erbij hoort. |
| | ⚖️ Meer-race | Twee stapels ringen: welke kant heeft er meer (of minder, of evenveel)? |
| | 🔴 Patroon-race | Rood, blauw, rood, blauw, ... wat komt hierna? |
| | 🌈 **Patroon-baan 3D** | Sonic rent over een zwevende baan met een patroon. Wat komt er op het laatste platform? Kies het plaatje en hij rent door. |
| | 🏝️ **Ringen-eilanden 3D** | Twee zwevende eilanden met stapels ringen of een getal. Tik het eiland met meer (of minder) en Sonic springt erheen. |
| | 💫 **Woord-race 3D** | Een woordje flitst in een grote gouden ring; daarna komen drie plaatjes omhoog. Kies het goede en Sonic racet erheen. |
| | 🌀 **Turbo-tunnel 3D** | Sonic rent door een 3D-wereld naar drie poorten. De stem zegt een woord; ren door de poort met de eerste letter. |
| **Tails** | 🎯 Katapult-sommen | Een som met ringen. Schiet de robot met het goede antwoord weg met de katapult. |
| | 🏗️ Tel & Bouw | Bouw een toren van n stenen en laat hem ontploffen. Of tel hoeveel stenen er staan. Elke steen wordt hardop geteld. |
| | 🚀 **Reken-tunnel 3D** | Tails rent door een 3D-wereld naar drie poorten. Ren door de poort met het antwoord van de som. |
| | 🧨 **Toren-boem 3D** | Blokken vallen op elkaar en de stem telt mee. Hoeveel blokken? Goed antwoord, dan ontploft de toren. |
| | 🛠️ **Splits-bom 3D** | Een grote bom met een krans van ringplekken. Een deel is gevuld: hoeveel moeten er nog bij? Tails gooit de ringen erin. Een fout getal laat zien waarom het niet past. |
| | 💣 Splits-bom | Een bom met n ringen is verstopt achter twee deurtjes. Hoeveel zitten er achter het andere deurtje? Maak de bom veilig. |
| **Knuckles** | 💥 Letter-smash | De stem zegt een woord. Sla de steen met de beginletter kapot. |
| | 🧱 Woord-bouwen | Er staat een plaatje. Leg het woordje met letterstenen in de goede volgorde. |
| | 🗼 **Toren-smash 3D** | Een draaiende toren van letterblokken. Tik op het blok met de beginletter, Knuckles slaat het eruit. |
| | 🏰 **Muur-bouwer 3D** | Boven een muur zweeft een plaatje. Tik de grote letterblokken in de goede volgorde: Knuckles slaat ze op hun plek en de muur danst. |
| | 🥊 **Letter-jacht 3D** | Letterblokken op zuiltjes in een tempel. Sla alle blokken met de gezochte letter kapot. |
| | 🔨 Letter-jacht | Een rij stenen met letters. Sla ze allemaal kapot die gelijk zijn aan de letter bovenin. |

De **3D-spellen** gebruiken Three.js met eigen cartoon-figuren en -werelden: filmisch licht, zachte schaduwen, randlicht, gloed rond ringen en zwevende glitters. Op een trage tablet schakelt de site zelf terug (minder pixels, daarna zonder schaduwen) en onthoudt dat. Heeft een apparaat geen WebGL, dan wordt automatisch het 2D-broertje gespeeld. Elk 3D-spel heeft zijn eigen herhalingsdoosjes.

**Bliksems en de Turbo-winkel.** Met elke ronde verdient Lucas 1 tot 3 ⚡ bliksems (net als de sterren), en met een dagmissie 5. In de **Turbo-winkel** (knop naast de dagmissie) koopt hij er dingen mee. Er wordt nooit echt geld uitgegeven. Alles heeft een stem die vertelt wat het is en wat het kost.

| Soort | Wat | Prijs |
|---|---|---|
| Powerups (opgebruiken, tik tijdens het spel op de knop bovenin) | ❤️ **Extra leven**: een foutje kost geen ringen en geen reeks (het telt nog wel mee voor het leren). ✨ **Dubbele ringen** voor één ronde. 🔥 **Vuurstart**: begin met een reeks van twee. 🐢 **Trage flits**: de flits blijft langer in beeld. | 3 tot 4 |
| Maatjes (voor altijd) | 🐥 kuikentje, 🦊 vosje, 🐲 draakje, 🦄 eenhoorn: kijkt mee in het spel en in het menu | 6 tot 18 |
| Ringen | 🥈 zilver, 🩷 roze, 🌈 regenboog | 8 tot 14 |
| Feest | ⚡ bliksemfeest, 💖 hartjesfeest, 🎆 vuurwerk | 10 tot 14 |
| Wereld | 🪐 ruimtewereld voor alle spellen | 20 |
| Helden | 🌟 supersnelle gouden helden (ook in de 3D-spellen) | 25 |

**Plakboek met stickers.** Na elke ronde krijgt Lucas een sticker (meestal een nieuwe; een dubbele levert een bliksem op, soms is er een glimmende regenboogsticker). Elke sticker is een woordje uit de woordenlijst met plaatje, dus hij leest het woord eronder, en de stem zegt het als hij erop tikt. Het plakboek (roze knop in het menu) heeft vier bladzijden: dieren, in huis, kleren en je lijf, buiten (64 stickers). Een volle bladzijde geeft 5 bliksems. In de winkel zijn stickerzakjes (3 stickers, 5 ⚡) en glimzakjes (met een glimmer, 8 ⚡).

Papa of mama kan in de ouderhoek bliksems geven als beloning, de winkel leegmaken en zien wat Lucas heeft gekocht. Prijzen en artikelen staan in `src/games/winkel.ts`, de teksten in `content/teksten.json` onder `winkel`.

**Dagmissie.** Drie spellen achter elkaar, een van elke held, vier opgaven per spel. Gelukt? Dan krijgt Lucas een **turbokristal** (regenboogkleuren). Bij het zevende kristal wordt hij **superheld**.

**Drie werelden** met eigen achtergrond (groene heuvels, stad bij nacht, grot met kristallen), **chiptune-muziek** (aan en uit te zetten; de muziek wordt zachter als de stem praat) en veel geluidseffecten, allemaal zelf gemaakt met Web Audio.

Verder:
- **Alles wordt voorgelezen** door een Nederlandse jongensstem (ElevenLabs, Milan). Er is geen tabletstem nodig; de teksten zijn vooraf ingesproken en werken offline.
- **Alle opnames zijn even hard en gecontroleerd.** Bij het maken worden ze op dezelfde luidheid gebracht (-18 LUFS), en elke opname wordt teruggeluisterd met spraakherkenning. Klinkt een woord of getal niet zoals bedoeld, dan wordt het opnieuw gemaakt (zie "De stem").
- **Proefrondje:** elk spel begint met 8 opgaven die steeds moeilijker worden. Daarmee kiest de site het startniveau.
- **Niveau per spel.** Rekenen gaat pas een stapje omhoog bij 9 van de 10 goed. Er zijn nooit moeilijkere opgaven dan zijn niveau, wel extra makkelijke.
- **Herhalingsdoosjes:** wat niet meteen goed ging, komt later terug (volgende keer, na 1, 3, 7 en 14 dagen).
- **Hint bij een fout, antwoord bij de tweede fout.** Nooit een straf: de opgave komt later terug.
- **Gouden ringen** vliegen naar de teller, met "3 op rij!"-combo's, ontploffingen en een schuddend scherm.
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
| `npm run audio -- --alleen=kat` | Spreekt alleen de teksten opnieuw in die "kat" bevatten (handig als een uitspraak niet klopt). |
| `npm run audio -- --stemmen` | Zoekt Nederlandse vrouwenstemmen in de ElevenLabs-bibliotheek. Pas het filter in het script aan voor mannen. |

**Zo worden opnames gemaakt** (`tools/maak-audio.ts`): woorden en getallen worden in een draagzin opgenomen ("Het woord is kat") en met woordtijden eruit geknipt, zodat de uitspraak natuurlijk klinkt. Daarna luistert `scribe_v1` mee; komt er iets anders uit dan bedoeld, dan volgt een nieuwe poging met een ander model of een andere seed. De stilte wordt weggesneden, de luidheid gelijkgetrokken en er komt een zachte begrenzer overheen (`tools/audio/dsp.ts`). Twijfelgevallen staan in `tools/audio-controle.json`.

Alles inspreken kost ongeveer 3.000 tekens, met controle iets meer. Een test bewaakt dat elke tekst, elk woord en elk getal tot 20 dat de app kan zeggen een opname heeft.

### Online zetten (Cloudflare)
De app draait als Cloudflare Worker met Static Assets (`wrangler.jsonc`). Eenmalig `npx wrangler login`, daarna `npm run deploy`. De app staat op **https://lucas-turbo-missie.exl999.workers.dev**. Op de tablet: open het adres in Chrome (met wifi), kies het menu (⋮) → "App installeren" en open de app daarna één keer; dan wordt alles (ongeveer 5 MB, inclusief alle stem) opgeslagen en werkt hij ook offline.

### Opbouw
```
src/app/      schermen: start, heldenkeuze, spelkeuze, ronde (Level), beloning, kristal, winkel, plakboek, ouderhoek
src/art/      Held (Sonic, Tails, Knuckles) en Robot
src/engine/   letters en woorden, sommen, niveau, doosjes, planning
src/games/    de twintig spellen, de dagmissie, de winkelartikelen en de gemeenschappelijke regels (Ronde)
src/audio/    stem, geluidseffecten en muziek
src/ui/       achtergronden, werelden, kristallen, ontploffingen, feest, drie-d.ts (3D-basis) en drie-d-vormen.ts
tools/audio/  opnames: luidheid, stiltes, MP3 en uitspraakcontrole
src/store/    voortgang en winkel op de tablet
```
