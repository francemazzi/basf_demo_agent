# ROADMAP

**Repo:** `francemazzi/basf_demo_agent`
**Demo:** settembre 2026, BASF Italia (Franco Salvetti commerciale, Maurizio/Moritz digital)
**Referenti:** Martina Dal Cero, Giorgio Fioretti
**Ultimo aggiornamento:** 8 agosto 2026

---

## Regola operativa

**Niente in questa roadmap è bloccato dalla risposta di BASF.**

I dati richiesti a Martina l'8 agosto migliorano il prototipo ma non lo abilitano. Ogni voce che dipende da loro porta il marcatore `[BASF]` e ha il fallback scritto accanto.

Al 25 agosto, se non è arrivato nulla, si chiude il registro e si procede sui fallback dichiarandolo in demo. Dichiararlo è un punto di forza: mostra esattamente dove serve l'integrazione vera.

---

## Fase 0 — Scaffolding e normalizzazione

**10-12 agosto. Nessuna dipendenza esterna.**

### Setup

- [ ] Monorepo pnpm con workspace `apps/*` e `packages/*`
- [ ] `packages/core`: tipi di dominio condivisi, nessuna dipendenza runtime
- [ ] `apps/api`: Fastify + tsx watch
- [ ] `apps/web`: Vite + React 18 + Tailwind
- [ ] `docker-compose.yml` con Postgres 16
- [ ] Prisma schema da Appendice C, prima migration
- [ ] ESLint + Prettier + tsconfig strict condiviso alla radice
- [ ] `.gitignore` con `data/raw/` e `.env`
- [ ] `.env.example` con `DEMO_FREEZE_DATE=2026-08-09`
- [ ] Helper `now()` in `packages/core` che legge `DEMO_FREEZE_DATE`. **Vietato usare `new Date()` altrove**

### Ingest

- [ ] `packages/ingest`: parser xlsx con `exceljs`
- [ ] Foglio `Vigneto` verso `appezzamento` (dati in Appendice A)
- [ ] Foglio `Meteo` verso `meteo_giornaliero`, 219 righe
- [ ] Vento e radiazione nullable: assenti per 82 giorni (1 gen - 23 mar), mai scrivere zero
- [ ] Foglio `Trattamenti` verso `operazione` + `operazione_prodotto`, 36 righe su 13 date
- [ ] Decodificare il separatore pipe in `Principi attivi (MOA)` e `(%)` in record distinti
- [ ] Validare `dose_ha / acqua_hl_ha ≈ dose_hl`, tolleranza 2%
- [ ] Foglio `Fertilizzazione` verso `fertilizzazione`, 5 righe
- [ ] Marcare le anomalie di Appendice B nel campo `anomalie[]`. **Non correggerle in silenzio**
- [ ] `pnpm --filter @basf/ingest seed` idempotente
- [ ] Test: 1 appezzamento, 219 giorni meteo, 36 operazioni, 5 fertilizzazioni

---

## Fase 1 — Da grafico a serie numerica

**12-19 agosto. `[BASF]` con fallback già operativo.**

I fogli `Output Malattie fungine` e `Output insetti` contengono solo intestazioni e dieci PNG.

- [ ] `[BASF]` Se arriva l'export numerico: importarlo con `fonte: 'basf_export'` e saltare il resto
- [ ] **Fallback:** estrarre i PNG da `xl/media/` (mappa in Appendice A)
- [ ] Pipeline Claude vision, un modulo per tipo di grafico
- [ ] `protezione_peronospora.png` verso serie giornaliera protezione %, 19/04 - 15/08
- [ ] `protezione_oidio.png`, stessa serie per Kumulus tecno
- [ ] `peronospora_infezioni.png`: dose inoculo, germinazione oospore, eventi, curve di incubazione
- [ ] `oidio_ascospore.png`: dispersione, eventi, infezione e incubazione, sporulazione
- [ ] `botrite.png`: sporulazione, infezioni, rischio cumulato
- [ ] `fenologia.png`: numero foglie e fase riproduttiva per data. **Serve allo scenario 2**
- [ ] Tre grafici insetti: percentuale popolazione per stadio e generazione
- [ ] Ancoraggio delle curve di protezione a due punti certi: soglia 70% dichiarata nel grafico, reset a 100% alle date di trattamento note dal foglio Trattamenti
- [ ] **Validazione:** confronto con i tre valori noti dal tooltip nella slide 2 del PPT (29/04/26: infezione 0.08, latenza 21/04 = 96%, latenza 29/04 = 11%). Errore registrato in `docs/accuratezza-estrazione.md`
- [ ] Output in `data/curves/*.json`, un record per giorno per serie, sempre con `fonte`

---

## Fase 2 — Adapter e knowledge base

**20-22 agosto. Nessuna dipendenza esterna.**

- [ ] Interfaccia `AgrigeniusAdapter` in `packages/core` (firme in Appendice D)
- [ ] `MockAgrigeniusAdapter`: legge da `data/curves` e da Postgres
- [ ] `HttpAgrigeniusAdapter`: stub con le stesse firme, da riempire quando arrivano le API
- [ ] Test di contratto condiviso: le due implementazioni devono passare la stessa suite
- [ ] `packages/kb`: 20 prodotti del caso studio con nome commerciale, numero registrazione, principi attivi, codici FRAC/IRAC, intervallo ditta, resistenza al dilavamento
- [ ] Popolare `intervallo_ditta` dai due valori certi letti nei grafici: Kauritil Tri Hi Bio 7-8 giorni, Kumulus tecno 7-10 giorni. Gli altri da etichetta ufficiale, nullable se non reperibile
- [ ] Regole di conformità: conteggio applicazioni per principio attivo e per gruppo MOA sulla stagione
- [ ] **I limiti di etichetta vanno marcati `limiti_verificati: false` finché non confermati su fonte ufficiale. Mai inventarli, in demo verrebbero contestati**
- [ ] Regola dilavamento: pioggia cumulata nelle 24h successive contro la soglia del prodotto

---

## Fase 3 — Agente e canale

**24-31 agosto. Nessuna dipendenza esterna.**

### Backend

- [ ] Grafo LangGraph.js con router di intento verso quattro tool
- [ ] `registra_operazione`: estrae prodotto, dose, superficie, data dal linguaggio naturale
- [ ] `consulta_dss`: legge rischio, protezione, fenologia dall'adapter
- [ ] `verifica_conformita`: resistenze, limiti applicazioni, intervalli
- [ ] `spiega`: traduce l'output del modello in linguaggio da campo
- [ ] Contesto appezzamento sempre in memoria: l'utente non dice mai dove si trova
- [ ] Quando manca un dato, l'agente chiede **un solo campo per volta**. Mai un form travestito da chat
- [ ] Derivare il BBCH dalla curva fenologica invece di chiederlo
- [ ] Trascrizione vocale Deepgram, modello italiano
- [ ] Vision su foto sintomo
- [ ] Job schedulato giornaliero che decide se aprire una conversazione in autonomia
- [ ] Tono: frasi brevi, niente gergo, niente elenchi puntati. Si legge su un telefono al sole in mezzo al vigneto

### Canale

- [ ] Webhook WhatsApp Business Cloud API, numero di test
- [ ] Gestione ingresso testo, audio, immagine
- [ ] **Fallback se Meta non approva in tempo:** simulatore React in `apps/web`, sufficiente per la registrazione video

### Frontend

- [ ] `apps/web` modalità simulatore: UI WhatsApp credibile, bolle, spunte, note vocali con waveform
- [ ] `apps/web` modalità regia: avanzamento data di sistema, selezione scenario, ispezione di cosa sta leggendo l'agente
- [ ] La regia non va mai mostrata a BASF, serve solo durante la registrazione

---

## Fase 4 — I cinque scenari

**1-5 settembre. In ordine di impatto decrescente.**

### 1. Alert proattivo (hero)

Nei grafici la linea "oggi" cade sull'8 agosto e la protezione sta scendendo sotto soglia. Ultimo trattamento 1 agosto, rame e zolfo, inizio invaiatura.

- [ ] L'agente scrive per primo, senza sollecitazione
- [ ] Protezione sotto soglia da domani, BBCH 81, ultimo intervento 8 giorni fa, cosa considerare
- [ ] Verificare che `DEMO_FREEZE_DATE` sia rispettato in tutto il percorso
- [ ] `[BASF]` Incrociare i bollettini se arrivano. **Fallback:** solo dato DSS

### 2. Registrazione da nota vocale

- [ ] Input: "ho dato zolfo e rame stamattina su tutto"
- [ ] Riconosce i due prodotti, deriva superficie 0,699 ha, deriva BBCH 81 dalla fenologia
- [ ] Chiede solo il campo realmente mancante
- [ ] Scrive via adapter e conferma in una riga
- [ ] **In slide:** la loro riga reale ferma su BBCH 105 dal 18/04 al 18/05 contro il BBCH derivato. È il prima e il dopo

### 3. Dilavamento

Evento reale: trattamento 10 maggio (Envita, Century SL, Sercadis, Ridomil Gold Combi), 22,3 mm l'11 maggio.

- [ ] "Ha piovuto stanotte, sono ancora coperto?"
- [ ] Ricalcolo su curva di protezione e resistenza al dilavamento
- [ ] Risposta con percentuale residua e raccomandazione, non un sì o no secco
- [ ] Evento alternativo per una seconda ripresa: 4 maggio più 34,8 mm il 5-6 maggio

### 4. Finestra di comparsa sintomi

È il dubbio che Martina ha segnalato in mail: l'utente non sa interpretare la finestra di 4-5 giorni.

- [ ] Foto di sintomo in ingresso, riconoscimento vision
- [ ] Risposta con finestra e fattori di incertezza, mai una data secca
- [ ] Citare il dato di Marano dal PPT: sporulazione oidio prevista dal 25 aprile, osservata il 28 su testimone non trattato, delta 3 giorni
- [ ] `[BASF]` Usare le osservazioni su Vidor se arrivano. **Fallback:** dato Marano

### 5. Conformità e quaderno di campagna

- [ ] Intercettare la terza applicazione di Revysion (Revysol, G1) prima della conferma
- [ ] Intercettare il secondo piretroide IRAC 3 della stagione (etofenprox 23/06, deltametrina 20/07)
- [ ] Segnalare le nove applicazioni contenenti dithianon
- [ ] Export quaderno di campagna PDF con le violazioni evidenziate **prima** della stampa
- [ ] Scarico magazzino su stock sintetico, dichiarato come simulato

---

## Fase 5 — Confezionamento

**8-11 settembre.**

- [ ] Registrazione schermo 4-6 minuti, scenari in ordine 1-2-3-4-5
- [ ] Sottotitoli: verrà guardata senza audio in riunione
- [ ] Report 6-8 slide: pain rilevato, cosa abbiamo fatto sui vostri dati, cosa ci manca da voi, next step
- [ ] Slide 1 = anomalie di Appendice B
- [ ] Slide finale con le richieste formali: API o export numerico, sandbox DSS, un utente reale per la validazione
- [ ] Il pacchetto deve reggere in una riunione senza Francesco presente
- [ ] Chiarire prima della call se il referente è Maurizio o Moritz

---

## Registro richieste a BASF

Inviate a Martina Dal Cero l'8 agosto, mail più promemoria WhatsApp.

| # | Richiesta | Stato | Fallback |
|---|---|---|---|
| 1 | Serie numeriche rischio infezione e protezione % su Vidor | [ ] in attesa | Estrazione vision, Fase 1 |
| 2 | Osservazioni di sintomo su Vidor con date | [ ] in attesa | Dato Marano dal PPT |
| 3 | Bollettini della zona in formato testo | [ ] in attesa | Solo output DSS |
| 4 | Tre o quattro domande reali dell'agricoltore | [ ] in attesa | Scenari dai pain emersi in call |
| 5 | Natura delle anomalie: export o inserimento utente | [ ] in attesa | Presentate come da confermare |
| 6 | Data di accesso alla demo del DSS | [ ] in attesa | Mock adapter, Fase 2 |

- [ ] Al 25 agosto: chiudere il registro e procedere sui fallback

---

## Appendice A — Dati del caso studio

### Appezzamento

| Campo | Valore |
|---|---|
| Località | Vidor loc. Cal Nova, Treviso (Prosecco DOCG) |
| Coordinate | 45.866393, 12.055809 |
| Superficie | 0,699 ha |
| Varietà | Glera |
| Resa attesa | 16 t/ha |
| Sistema colturale | Convenzionale |
| Allevamento | Controspalliera a chioma semplice |
| Stagione | 2025/2026 |
| Stazione meteo | produttore Nesa |
| Cautela peronospora | Alto (impostato manualmente dall'utente) |

### Meteo

219 giorni, 1 gennaio - 7 agosto 2026. Pioggia totale 499 mm.
Colonne: pioggia, T max/min/media, direzione e velocità vento virtuale, radiazione solare virtuale, umidità max/media/min, bagnatura fogliare.
Vento e radiazione assenti dall'1 gennaio al 23 marzo.

Eventi rilevanti per gli scenari:

| Data | mm | Contesto |
|---|---|---|
| 20/04 | 13,9 | 2 giorni dopo trattamento 18/04 |
| 05-06/05 | 34,8 | 1-2 giorni dopo trattamento 04/05 |
| 11/05 | 22,3 | 1 giorno dopo trattamento 10/05 |
| 14/05 | 13,7 | |
| 31/05-01/06 | 29,7 | 3 giorni dopo trattamento 28/05 |
| 03/06 | 17,6 | giorno prima del trattamento 04/06 |
| 10/06 | 19,9 | |
| 21/06 | 12,5 | 2 giorni prima del trattamento 23/06 |

### Calendario trattamenti

13 date, 36 righe prodotto, 18 aprile - 1 agosto.

| Data | BBCH | Prodotti |
|---|---|---|
| 18/04 | 105 | Essen'ciel (orange oil F7), Envita SC (dithianon MS) |
| 27/04 | 105 | Century Pro (fosfonato K P7), Essen'ciel, Envita SC |
| 04/05 | 105 | Delan Pro (fosfonato K P7 + dithianon MS), Revysion (Revysol G1) |
| 10/05 | 105 | Envita (dithianon), Century SL (fosfonato K), Sercadis (Xemium C2), Ridomil Gold Combi WG (metalaxyl-M A1 + folpet MS) |
| 18/05 | 105 | Revysion (G1), Delan Pro, Orondis (oxathiapiprolin F9) |
| 28/05 | 65 | Sercadis (C2), Delan Pro |
| 04/06 | 71 | Folpan 80 WDG (folpet), Enervin system (fosfonato K + ametoctradin C8), Revysion (G1) |
| 13/06 | 71 | Delan Pro, Sivanto prime (flupyradifurone IRAC 4), Vivando (metrafenone) |
| 23/06 | 71 | Microthiol Disperss (zolfo), Enervin SC (ametoctradin C8), Trebon UP (etofenprox IRAC 3), Folpan 80 WDG |
| 01/07 | 71 | Envita SC, Vivando |
| 10/07 | 71 | Envita SC, Camplan SC (cymoxanil), Cosavet DF (zolfo) |
| 20/07 | 77 | Decis Evo (deltametrina IRAC 3), Kauritil Tri Hi Bio (solfato di rame), Kumulus tecno (zolfo) |
| 01/08 | 81 | Kumulus tecno, Kauritil Tri Hi Bio |

### Fertilizzazioni

18/04 EliteSea 1 kg/ha, 27/04 EliteSea 1,5, 04/05 EliteSea 1,5, 10/05 EliteSea 1,5 + Boroplus 1. Tutte su 0,7 ha.

### PNG estratti da `xl/media/`

| File | Contenuto | Foglio |
|---|---|---|
| image1.png | Fenologia: emissione foglie, fasi riproduttive | Vigneto |
| image2.png | Meteo: pioggia, temperature, umidità, bagnatura | Meteo |
| image3.png | Protezione peronospora, ultimo trattamento e stagione | Output Malattie fungine |
| image4.png | Oidio ascosporico | Output Malattie fungine |
| image5.png | Botrite | Output Malattie fungine |
| image6.png | Infezioni primarie peronospora | Output Malattie fungine |
| image7.png | Protezione oidio | Output Malattie fungine |
| image8.png | Tignoletta, 3 generazioni | Output insetti |
| image9.png | Planococcus ficus, 3 generazioni | Output insetti |
| image10.png | Scaphoideus titanus | Output insetti |

### Materiale dal PPT

Zona diversa: Marano di Valpolicella e San Pietro in Cariano (Verona). Materiale di validazione.

- Slide 1: Lobesia botrana, bollettino n. 17 dell'8 luglio, prima segnalazione 2a generazione larvale, tabella finestre di intervento per bassa e alta collina
- Slide 2: oidio, sporulazione prevista dal 25 aprile, osservata il 28 aprile su testimone non trattato. Tooltip con valori numerici usati per validare l'estrazione
- Slide 3: peronospora, confronto 2024 contro 2026, germinazione oospore molto precoce nel 2024

---

## Appendice B — Anomalie rilevate

Marcate, non corrette. Materiale della prima slide del report.

- [ ] **BBCH congelato**: fase ferma su "emissione 5a foglia" (105) dal 18 aprile al 18 maggio, 12 righe su 5 date, mentre il grafico fenologico mostra il passaggio dalla 5a a circa la 14a foglia. Anche BBCH 71 resta invariato dal 04/06 al 10/07
- [ ] **Avversità errata**: Folpan 80 WDG (folpet, multisito antiperonosporico) registrato contro oidio il 04/06 e il 23/06
- [ ] **Tipo operazione errato**: foglio Fertilizzazione con "Trattamento di difesa / Fitoregolatori" su tutte e 5 le righe di concime
- [ ] **Codice MOA mancante**: Vivando riporta "Metrafenone" senza codice FRAC
- [ ] **Codice MOA sospetto**: Camplan SC riporta "Cymoxanil (SC)". Il cymoxanil è FRAC 27, "SC" sembra un codice di formulazione finito nel campo sbagliato
- [ ] **Ripetizioni MOA senza alert dal DSS**: Revysol G1 tre volte (04/05, 18/05, 04/06), due piretroidi IRAC 3 (23/06 e 20/07), nove applicazioni contenenti dithianon, sette contenenti fosfonato di potassio. Verificare i limiti su etichetta prima di dichiararli superati
- [ ] **Doppia registrazione stesso principio attivo**: Envita SC (reg. 17422) ed Envita (reg. 19119), entrambi dithianon

---

## Appendice C — Schema Prisma

```
appezzamento         id, nome, lat, lon, superficieHa, varieta, resaAttesa,
                     sistemaColturale, allevamento, stazioneMeteo,
                     cautelaPeronospora, stagione

meteoGiornaliero     appezzamentoId, giorno, pioggiaMm, tMax, tMin, tMedia,
                     ventoDir?, ventoVel?, radiazione?, umMax, umMedia,
                     umMin, bagnaturaH

operazione           id, appezzamentoId, data, tipo, haTrattati, bbch,
                     faseFenologica, avversita, giustificazione,
                     indicazioneDss, anomalie String[]

operazioneProdotto   operazioneId, nomeCommerciale, numeroRegistrazione,
                     quantitaTot, doseHa, doseHl, acquaHlHa

principioAttivo      operazioneProdottoId, nome, codiceMoa, percentuale, casRn

fertilizzazione      appezzamentoId, data, superficieHa, formaFisica,
                     categoria, fertilizzante, doseKgHa, anomalie String[]

curvaDss             appezzamentoId, avversita, serie, giorno, valore,
                     fonte Fonte

prodottoKb           nomeCommerciale, numeroRegistrazione, principiAttivi String[],
                     codiciMoa String[], intervalloDittaGiorni Int[]?,
                     resistenzaDilavamentoMm?, maxApplicazioniStagione?,
                     limitiVerificati Boolean

enum Fonte { BASF_EXPORT VISION_EXTRACTION }
```

`fonte` su `curvaDss` è obbligatorio. In riunione si deve poter dire quale numero viene da BASF e quale è ricostruito.

---

## Appendice D — Interfaccia adapter

```typescript
// packages/core/src/adapter.ts

export interface AgrigeniusAdapter {
  getRischio(data: Date, avversita: Avversita): Promise<RischioResult>;
  getProtezione(data: Date, avversita: Avversita): Promise<ProtezioneResult>;
  getFenologia(data: Date): Promise<FenologiaResult>;
  getAlert(data: Date): Promise<Alert[]>;
  getFinestraSintomi(
    dataInfezione: Date,
    avversita: Avversita
  ): Promise<FinestraSintomi>;
  registraOperazione(payload: OperazionePayload): Promise<{ id: string }>;
}

export type Fonte = "basf_export" | "vision_extraction";

export interface ProtezioneResult {
  percentuale: number;
  sottoSoglia: boolean; // soglia dichiarata nel grafico: 70%
  ultimoTrattamento: Date;
  prodotto: string;
  intervalloDitta: [number, number] | null;
  fonte: Fonte;
}

export interface FinestraSintomi {
  da: Date;
  a: Date;
  confidenza: "alta" | "media" | "bassa";
  fattoriIncertezza: string[]; // es. tipo di foglia, andamento termico
  validazioneNota?: string; // es. delta 3 giorni misurato a Marano 2026
  fonte: Fonte;
}
```

Due implementazioni, stessa suite di test di contratto: `MockAgrigeniusAdapter` in Fase 2, `HttpAgrigeniusAdapter` quando arrivano le API. L'agente non deve sapere quale sta usando.

---

## Appendice E — Note

- La demo del DSS non è disponibile prima di fine agosto o settembre, serve supporto dei colleghi di sede BASF
- I numeri esistono nel frontend Agrigenius, visibili nei tooltip (provato dalla slide 2 del PPT). Manca solo l'export
- Meteo e trattamenti sono stati esportati in tabella senza problemi: il limite non è la piattaforma, è il rendering dell'output dei modelli. Argomento da usare a settembre
- Martina Dal Cero: 347 5321336
