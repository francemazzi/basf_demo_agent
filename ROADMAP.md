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

## Regola di avanzamento

Nessuna fase si chiude senza il suo test di integrazione verde. La sequenza è: implementare, eseguire `pnpm test:integration`, correggere finché non passa, spuntare le caselle qui sotto, passare alla fase successiva.

I test che chiamano un modello usano OpenRouter con modelli low-cost (`OPENROUTER_MODEL`), e si saltano da soli se `OPENROUTER_API_KEY` non è impostata.

L'ordine di implementazione è **0 → 2 → 1 → 3 → 4 → 5**: i CSV normalizzati sbloccano subito l'adapter, mentre l'estrazione dai grafici serve soprattutto al gap del 20/07-01/08 e alla fenologia.

---

## Fase 0 — Scaffolding e normalizzazione

**Chiusa. Gate: `packages/ingest/src/seed.integration.test.ts`, `apps/api/src/health.integration.test.ts`.**

### Setup

- [x] Monorepo pnpm con workspace `apps/*` e `packages/*`
- [x] `packages/core`: tipi di dominio condivisi, nessuna dipendenza runtime
- [x] `apps/api`: Fastify + tsx watch
- [x] `apps/web`: Vite + React 18 + Tailwind
- [x] `docker-compose.yml` con Postgres 16
- [x] Prisma schema da Appendice C in `packages/db`, applicato con `prisma db push`. Le migration versionate arrivano quando lo schema si stabilizza
- [x] ESLint + Prettier + tsconfig strict condiviso alla radice. Regola ESLint che vieta `new Date()`
- [x] `.gitignore` con `data/raw/` e `.env`
- [x] `.env.example` con `DEMO_FREEZE_DATE=2026-08-09`, `DATABASE_URL` e le variabili OpenRouter
- [x] Helper `now()` in `packages/core` che legge `DEMO_FREEZE_DATE`. **Vietato usare `new Date()` altrove**

### Ingest

- [x] `packages/ingest`: loader dei CSV normalizzati in `data/seed/`. Il parser xlsx con `exceljs` non è sul critical path: i CSV sono già stati estratti e sono la fonte del seed
- [x] `appezzamento.csv` verso `appezzamento`
- [x] `meteo_giornaliero.csv` verso `meteo_giornaliero`, 219 righe
- [x] Vento e radiazione nullable: assenti per 82 giorni (1 gen - 23 mar), mai scrivere zero
- [x] `operazioni.csv` verso `operazione` + `operazione_prodotto`, 36 righe su 13 date
- [x] Decodificare il separatore pipe in `Principi attivi (MOA)` e `(%)` in record distinti, 42 righe
- [x] Validare `dose_ha / acqua_hl_ha ≈ dose_hl`, tolleranza 2%
- [x] `fertilizzazioni.csv` verso `fertilizzazione`, 5 righe
- [x] Marcare le anomalie di Appendice B nel campo `anomalie[]`. **Non corrette in silenzio**
- [x] `pnpm --filter @basf/ingest seed` idempotente
- [x] Test: 1 appezzamento, 219 giorni meteo, 36 operazioni, 42 principi attivi, 5 fertilizzazioni

### Note emerse

- Lo stato DSS categorico è normalizzato in `operazione.statoDss` in quattro valori. Copre 29 righe su 36: restano scoperte il 20/07 e il 01/08, cioè le due date dello scenario hero
- L'enum `Fonte` ha due valori in più rispetto all'Appendice C: `BASF_DICHIARAZIONE_DSS` e `BASF_GRAFICO_ANCORAGGIO`, già usati dai CSV
- Postgres gira sulla porta 55432 per non collidere con installazioni locali

---

## Fase 1 — Da grafico a serie numerica

**Chiusa sul perimetro che serve alla demo. Gate: `packages/curves/src/curves.integration.test.ts`.**

I fogli `Output Malattie fungine` e `Output insetti` contengono solo intestazioni e dieci PNG. **I PNG non sono nel repository**: `data/raw/` è vuoto e va popolato con il file BASF originale. La pipeline vision è scritta e parte da sola quando le immagini compaiono in `data/raw/media/`.

- [ ] `[BASF]` Se arriva l'export numerico: importarlo con `fonte: 'basf_export'`. La precedenza fra fonti è già implementata, un export BASF sovrascrive qualsiasi ricostruzione
- [x] Pipeline vision in `packages/curves`, un modulo di specifica per tipo di grafico, su OpenRouter con modello vision economico
- [x] La pipeline dichiara quali immagini mancano invece di produrre serie vuote spacciate per lette
- [ ] `image3.png` protezione peronospora e `image7.png` protezione oidio: in attesa dei file
- [ ] `image1.png` fenologia: in attesa del file
- [ ] `peronospora_infezioni.png`, `oidio_ascospore.png`, `botrite.png` e i tre grafici insetti: fuori dal perimetro della demo, si estraggono solo se servono al polish
- [x] Ancoraggio delle curve di protezione ai due punti certi: reset a 100% alle date di trattamento e soglia 70% dichiarata nel grafico
- [x] **Ricostruzione dichiarata** per coprire il buco 20/07 - 09/08: discesa lineare dal 100% del trattamento fino al 70% al primo giorno dell'intervallo dichiarato dalla ditta. Viaggia con `fonte: RICOSTRUZIONE` e l'agente deve dirlo
- [x] Ricostruzione della curva fenologica fra i due estremi letti sul grafico: 5a foglia il 18/04, circa la 14a il 18/05. **Serve allo scenario 2**
- [x] **Validazione:** confronto con i valori noti dal tooltip nella slide 2 del PPT. Report in `docs/accuratezza-estrazione.md`
- [x] Output in `data/curves/*.json`, un record per giorno per serie, sempre con `fonte`

### Note emerse

- Al 9 agosto la protezione ricostruita per l'oidio è sotto la soglia del 70%: lo scenario hero regge anche senza export BASF, ma il numero è dichiarato come nostro
- Senza i PNG nessuno dei cinque tooltip di `validazione_estrazione.csv` è coperto. Il report lo scrive a chiare lettere invece di nasconderlo
- La ricostruzione della protezione esiste solo dal 20/07 in poi, perché prima nessun prodotto ha un intervallo ditta dichiarato. Nelle date precedenti l'agente usa lo stato categorico del DSS
- Aggiunto il valore `RICOSTRUZIONE` all'enum `Fonte`

---

## Fase 2 — Adapter e knowledge base

**Chiusa. Gate: `apps/api/src/adapter.integration.test.ts`, `packages/kb/src/kb.integration.test.ts`, `packages/llm/src/traduzione.integration.test.ts`.**

- [x] Interfaccia `AgrigeniusAdapter` in `packages/core` (firme in Appendice D)
- [x] `MockAgrigeniusAdapter` in `packages/adapter`: legge da Postgres e dalla tabella `curvaDss`, che la Fase 1 riempirà da `data/curves`
- [x] `HttpAgrigeniusAdapter`: stesse firme sopra HTTP. Oggi parla con la nostra API, il giorno delle API BASF cambia solo la base URL
- [x] Test di contratto condiviso: la stessa suite gira su mock e su HTTP
- [x] `packages/kb`: 22 prodotti del caso studio con nome commerciale, numero registrazione, principi attivi, codici FRAC/IRAC, intervallo ditta, resistenza al dilavamento
- [x] Popolato `intervallo_ditta` dai due valori certi letti nei grafici: Kauritil Tri Hi Bio 7-8 giorni, Kumulus tecno 7-10 giorni. Gli altri restano nulli
- [x] Regole di conformità: conteggio applicazioni per principio attivo e per gruppo MOA sulla stagione, ricalcolate dal database e confrontate con `conteggi_conformita.csv`
- [x] **I limiti di etichetta restano `limitiVerificati: false`. Dove il limite manca l'agente dice "da verificare", non dichiara un superamento**
- [x] Regola dilavamento: pioggia cumulata dopo il trattamento contro la soglia del prodotto. Il millimetraggio è calcolato dal meteo, la soglia resta nulla finché non arriva l'etichetta

### Note emerse

- Il conteggio per principio attivo aggrega da solo le due registrazioni di dithianon (Envita SC 17422 ed Envita 19119): nove applicazioni, come nell'Appendice B
- La soglia di attenzione sul gruppo MOA è due applicazioni per i piretroidi IRAC 3 e tre per gli altri gruppi
- `getFinestraSintomi` restituisce una stima da letteratura con `fonte: null` e confidenza bassa: finché non arrivano le curve BASF, la finestra va dichiarata come nostra
- Aggiunto `packages/llm`: client OpenRouter usato dai gate con modelli low-cost e dall'agente in Fase 3

---

## Fase 3 — Agente e canale

**Chiusa. Gate: `packages/agent/src/agente.integration.test.ts`, `apps/api/src/canale.integration.test.ts`.**

### Backend

- [x] Grafo LangGraph.js con router di intento verso i tool, modello configurabile su OpenRouter
- [x] `registra_operazione`: estrae prodotti e data dal linguaggio naturale, scrive una riga di quaderno per prodotto
- [x] `consulta_dss`: legge rischio, protezione e fenologia dall'adapter
- [x] `verifica_conformita`: ripetizioni di principio attivo e gruppo MOA, intervalli della ditta
- [x] `spiega`: quadro della stagione e alert aperti
- [x] Due strumenti in più emersi dagli scenari: `verifica_dilavamento` e `finestra_sintomi`
- [x] Contesto appezzamento sempre in memoria: l'utente non dice mai dove si trova
- [x] Quando manca un dato, l'agente chiede **un solo campo per volta**
- [x] Derivare il BBCH dalla curva fenologica invece di chiederlo
- [x] Trascrizione vocale Deepgram, modello italiano. Senza chiave il simulatore manda il testo e `/capacita` lo dichiara
- [x] Vision su foto sintomo: il messaggio accetta un'immagine e la passa al modello
- [x] Job di apertura proattiva: valuta gli alert del giorno e **non scrive** se non c'è niente di urgente
- [x] Tono: frasi brevi, niente gergo, niente elenchi puntati

### Canale

- [x] Webhook WhatsApp Business Cloud API con verifica del token, ingresso testo e audio, risposta asincrona
- [x] Gestione ingresso testo, audio, immagine
- [x] **Fallback se Meta non approva in tempo:** simulatore React in `apps/web`, sufficiente per la registrazione video

### Frontend

- [x] `apps/web` modalità simulatore: bolle, indicatore di scrittura, battute pronte per la registrazione
- [x] `apps/web` modalità regia: cambio della data di sistema, stato letto dall'agente, strumenti dell'ultimo turno, reset del quaderno
- [x] La regia non va mai mostrata a BASF, serve solo durante la registrazione

### Note emerse

- Il giorno della conversazione arriva agli strumenti come parametro: senza, il pannello di regia cambiava data ma l'agente continuava a leggere il 9 agosto
- `zolfo` e `rame` corrispondono a più prodotti registrati. Invece di fermare la conversazione, l'agente risolve sull'ultimo prodotto realmente usato sull'appezzamento e lo dichiara nella risposta
- Un trattamento raccontato al passato si registra subito, uno chiesto al futuro passa prima dalla verifica di conformità
- Il gruppo MOA `MS` è escluso dagli avvisi di resistenza: i multisito sono lo strumento contro la resistenza, segnalarli tredici volte a stagione è solo rumore
- Gli id delle operazioni seguono `YYYY-MM-DD-NN` con riprova sul progressivo: le chiamate dello stesso turno arrivano in parallelo

---

## Fase 4 — I cinque scenari

**Chiusa. Gate: `packages/agent/src/scenari.integration.test.ts`, un blocco per scenario.**

Ordine di lavorazione 3 → 5 → 2 → 1 → 4, per prontezza del dato. Ordine di racconto nel video invariato, 1-5.

### 1. Alert proattivo (hero)

Nei grafici la linea "oggi" cade sull'8 agosto e la protezione sta scendendo sotto soglia. Ultimo trattamento 1 agosto, rame e zolfo, inizio invaiatura.

- [x] L'agente scrive per primo, senza sollecitazione
- [x] Protezione sotto soglia da domani, BBCH 81, ultimo intervento 8 giorni fa, cosa considerare
- [x] Verificare che `DEMO_FREEZE_DATE` sia rispettato in tutto il percorso
- [x] `[BASF]` Incrociare i bollettini se arrivano. **Fallback in uso:** solo dato DSS

### 2. Registrazione da nota vocale

- [x] Input: "ho dato zolfo e rame stamattina su tutto"
- [x] Riconosce i due prodotti, deriva superficie 0,699 ha, deriva BBCH 81 dalla fenologia
- [x] Chiede solo il campo realmente mancante
- [x] Scrive via adapter e conferma in una riga
- [x] **In slide:** la loro riga reale ferma su BBCH 105 dal 18/04 al 18/05 contro il BBCH derivato 114. È il prima e il dopo

### 3. Dilavamento

Evento reale: trattamento 10 maggio (Envita, Century SL, Sercadis, Ridomil Gold Combi), 22,3 mm l'11 maggio.

- [x] "Ha piovuto stanotte, sono ancora coperto?"
- [x] Ricalcolo su curva di protezione e resistenza al dilavamento
- [x] Risposta con percentuale residua e raccomandazione, non un sì o no secco
- [x] Evento alternativo per una seconda ripresa: 4 maggio più 34,8 mm il 5-6 maggio

### 4. Finestra di comparsa sintomi

È il dubbio che Martina ha segnalato in mail: l'utente non sa interpretare la finestra di 4-5 giorni.

- [x] Foto di sintomo in ingresso, riconoscimento vision
- [x] Risposta con finestra e fattori di incertezza, mai una data secca
- [x] Citare il dato di Marano dal PPT: sporulazione oidio prevista dal 25 aprile, osservata il 28 su testimone non trattato, delta 3 giorni
- [x] `[BASF]` Usare le osservazioni su Vidor se arrivano. **Fallback in uso:** dato Marano

### 5. Conformità e quaderno di campagna

- [x] Intercettare la terza applicazione di Revysion (Revysol, G1) prima della conferma
- [x] Intercettare il secondo piretroide IRAC 3 della stagione (etofenprox 23/06, deltametrina 20/07)
- [x] Segnalare le nove applicazioni contenenti dithianon
- [x] Export quaderno di campagna PDF con le violazioni evidenziate **prima** della stampa
- [x] Scarico magazzino su stock sintetico, dichiarato come simulato

### Note emerse

- La resistenza al dilavamento non è sull'etichetta di nessuno dei quattro prodotti del 10 maggio: `superata` resta `null` e l'agente dice i millimetri e il dubbio, non una sentenza. È la richiesta n.1 a BASF vista dal lato scenario
- Il quaderno e il magazzino vivono in `packages/quaderno`: PDF con `pdfkit`, violazioni in testa al documento, stock iniziale sintetico e sempre etichettato come tale
- Lo scenario 2 scrive davvero nel quaderno. I test lo ripuliscono in coda, altrimenti lo scenario hero legge zero giorni dall'ultimo trattamento invece di otto
- La foto del sintomo nel gate è un PNG generato dal test. Le foto vere su Vidor restano la richiesta n.2

---

## Fase 5 — Confezionamento

**Chiusa sugli asset. Gate: `apps/api/src/smoke.integration.test.ts`, i cinque scenari via HTTP più la checklist del pacchetto.**

- [x] Copione della registrazione, 4-6 minuti, scenari in ordine 1-2-3-4-5: `docs/copione-video.md`
- [x] Sottotitoli scritti nel copione: verrà guardata senza audio in riunione
- [x] Report in otto slide: pain rilevato, cosa abbiamo fatto sui vostri dati, cosa ci manca da voi, next step. `docs/report-basf.md`
- [x] Slide 1 = rilievi di Appendice B, inquadrati come costo dell'inserimento manuale e non come difetti del DSS
- [x] Slide 4 = assorbe l'obiezione "quel campo lo stiamo già togliendo", aggiunta dopo la risposta dell'11/08
- [x] Slide finale con le richieste formali: sandbox DSS e un utente reale per la validazione. **L'export numerico è uscito**: chiedere una cosa dichiarata impossibile costa credibilità
- [x] Il pacchetto deve reggere in una riunione senza Francesco presente
- [ ] Registrazione schermo vera e propria, da girare seguendo il copione
- [ ] Chiarire prima della call se il referente è Maurizio o Moritz

### Note emerse

- Il gate ripercorre i cinque scenari via HTTP nell'ordine della registrazione, non in quello di costruzione: è il modo più vicino a girare il video senza girarlo
- Lo smoke controlla anche gli asset: ordine degli scenari nel copione, numero di slide fra sei e otto, e che ogni anomalia del dataset sia citata nel report. Se qualcuno riscrive una slide e perde un'anomalia, il test lo dice
- `pnpm dev` alla radice avvia api e web insieme: durante la registrazione non si aprono due terminali
- README riallineato: lo stack dichiarava ancora Anthropic e il seed da xlsx

---

## Registro richieste a BASF

Inviate a Martina Dal Cero l'8 agosto, mail più promemoria WhatsApp. **Risposta di Giorgio Fioretti l'11 agosto**, in copia a Martina, che conferma su WhatsApp.

| # | Richiesta | Stato | Esito |
|---|---|---|---|
| 1 | Serie numeriche rischio infezione e protezione % su Vidor | [x] **chiusa NO, definitiva** | Non esistono in forma numerica. Il rischio è un cruscotto a colori, categorico per costruzione; la protezione residua è "praticamente impossibile" da serializzare perché si rigenera a ogni trattamento per effetto accumulo. Estrazione vision confermata come architettura, non come ripiego |
| 2 | Osservazioni di sintomo su Vidor con date | [x] chiusa SÌ | **Primi sintomi di peronospora il 9 giugno 2026.** Sostituisce il dato Marano come riscontro primario |
| 3 | Bollettini della zona in formato testo | [x] chiusa SÌ | Bollettini fitosanitari vite Regione Veneto 2026, settimanali, PDF pubblici. **Regionali, non per zona**: un'unica serie copre anche Vidor. Ingeriti: 14 numeri dal 23/04 al 06/08 in `data/seed/bollettini/`, modulo `packages/kb/src/bollettini.ts`. Valgono più del previsto: contengono il BBCH settimanale della Glera |
| 4 | Tre o quattro domande reali dell'agricoltore | [x] chiusa, una sola | *"Quando devo trattare"*, cioè come posizionarsi fra un evento piovoso e il successivo. È testualmente lo scenario 3 |
| 5 | Natura delle anomalie: export o inserimento utente | [x] chiusa | **Inserimento utente.** Meccanismi in Appendice B |
| 6 | Data di accesso alla demo del DSS | [ ] in attesa | Martina il 07/08: fine mese o settembre, serve supporto dai colleghi di sede. Fallback: mock adapter, Fase 2 |
| 7 | Conferma scritta della rimozione del campo fase fenologica e tempistica | [ ] in attesa | Detto da Martina **solo su WhatsApp**. Cambia il posizionamento della slide 4 e dello scenario 2: serve a verbale. Chiesto nella bozza di risposta a Giorgio |

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

- [x] **BBCH congelato**: fase ferma su "emissione 5a foglia" (105) dal 18 aprile al 18 maggio, 12 righe su 5 date, mentre il grafico fenologico mostra il passaggio dalla 5a a circa la 14a foglia. Anche BBCH 71 resta invariato dal 04/06 al 10/07.
  **Spiegato da Giorgio Fioretti l'11/08/2026: inserimento utente, non export.** Tre cause: (a) il sistema calcola la fenologia ma la chiede comunque all'utente "come ulteriore riscontro di quanto calcolato"; (b) la funzione **Duplica operazione** riparte dall'ultima operazione inserita e trascina i campi non modificati; (c) sulla vite l'emissione di ogni foglia serve ai monitoraggi territoriali, non all'azienda, quindi l'utente aggiorna la fase solo alla fioritura. Lo stesso meccanismo spiega il BBCH 71 fermo dal 04/06 al 10/07.
  Su WhatsApp Martina Dal Cero aggiunge che **nella nuova interfaccia il campo sparirà dal momento di inserimento del trattamento**. Non è a verbale in mail: vedi richiesta 7 del registro.
  **Terzo riscontro, pubblico e indipendente:** i bollettini della Regione del Veneto danno la Glera a 15-55 il 29/04 (5a foglia ancora plausibile) ma già a 57-61, fioritura, il 13/05 anche negli ambienti più tardivi. Il quaderno resta sulla 5a foglia fino al 18/05. È l'unico riscontro che non passa da una nostra ricostruzione: in riunione regge anche se qualcuno contesta l'estrazione vision.
- [x] **Avversità errata**: Folpan 80 WDG (folpet, multisito antiperonosporico) registrato contro oidio il 04/06 e il 23/06.
  **Refuso in inserimento, confermato l'11/08.** Ma il DSS si comporta correttamente non segnalandolo, perché Folpan 80 WDG riporta l'oidio in etichetta. **Non presentabile come mancato alert del DSS**: sopravvive solo come dato agronomicamente sbagliato che nessuno a valle può intercettare.
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
