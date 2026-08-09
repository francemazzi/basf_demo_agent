# BASF Demo Agent

Prototipo di agente conversazionale su WhatsApp costruito sopra i modelli previsionali **Agrigenius Vite** di BASF.

> ⚠️ **Repository privato.** Contiene dati di un vigneto reale forniti da BASF Italia (coordinate catastali, calendario trattamenti, serie meteo). L'azienda è anonimizzata nel file sorgente ma le coordinate identificano l'appezzamento. Non rendere pubblico e non committare `data/raw/`.

---

## Contesto

BASF ha acquisito Horta e distribuisce Agrigenius Vite, un DSS con modelli su peronospora, oidio, botrite e insetti alimentati da stazioni meteo. Il prodotto ha tre limiti dichiarati dal loro stesso team commerciale:

1. L'inserimento dei trattamenti è troppo oneroso, quindi l'utente compila male o smette
2. Non esiste quaderno di campagna né magazzino, per scelta di prodotto
3. Non ci sono alert su intervalli e resistenze in caso di applicazioni ripetute

Il target sono viticoltori spesso over 60 con bassa adozione digitale. Questo prototipo dimostra che WhatsApp, con un agente sopra, rimuove tutti e tre i limiti.

Demo prevista a settembre 2026 davanti alla direzione commerciale e digital di BASF Italia.

---

## Cosa fa

Cinque scenari, in ordine di impatto:

| # | Scenario | Cosa dimostra |
|---|---|---|
| 1 | Alert proattivo | L'agente scrive per primo quando la protezione scende sotto il 70% |
| 2 | Registrazione da nota vocale | Una frase parlata diventa un'operazione completa, con BBCH derivato dal modello fenologico invece che chiesto |
| 3 | Dilavamento | "Ha piovuto 22 mm, sono ancora coperto?" con ricalcolo sulla curva di protezione |
| 4 | Finestra di comparsa sintomi | Risposta con finestra e incertezza dichiarata, non con una data secca |
| 5 | Conformità e quaderno di campagna | Resistenze e limiti intercettati prima della conferma, export QdC |

---

## Stack

| Livello | Tecnologia |
|---|---|
| Linguaggio | TypeScript ovunque |
| Frontend | React 18 + Vite + Tailwind |
| Backend | Node 20 + Fastify |
| Agente | LangGraph.js + LangChain |
| LLM | OpenRouter, modello configurabile: low-cost nei test, più capace in demo |
| Vocale | Deepgram (italiano) |
| Vision | Modello vision via OpenRouter, per foto sintomi ed estrazione curve dai grafici |
| Dati | PostgreSQL 16 + Prisma |
| Canale | WhatsApp Business Cloud API, con simulatore React come fallback |
| Locale | Docker Compose |

---

## Struttura

```
basf_demo_agent/
├── apps/
│   ├── web/                 React: simulatore WhatsApp + pannello regia demo
│   └── api/                 Fastify: webhook, chat, quaderno, regia
├── packages/
│   ├── core/                Tipi di dominio, interfaccia AgrigeniusAdapter, now()
│   ├── db/                  Schema Prisma e client condiviso
│   ├── ingest/              Loader CSV idempotente da data/seed/
│   ├── curves/              Ricostruzione curve di protezione e fenologia
│   ├── adapter/             MockAgrigeniusAdapter + HttpAgrigeniusAdapter
│   ├── kb/                  Knowledge base prodotti e regole di conformità
│   ├── llm/                 Client OpenRouter, testo e vision
│   ├── agent/               Grafo LangGraph e strumenti
│   └── quaderno/            Quaderno di campagna in PDF e magazzino simulato
├── data/
│   ├── seed/                CSV normalizzati dal caso studio
│   └── curves/              Serie ricostruite, con fonte dichiarata
├── docs/
│   ├── copione-video.md     Copione della registrazione
│   ├── report-basf.md       Le sette slide del report
│   └── accuratezza-estrazione.md
├── docker-compose.yml
├── ROADMAP.md
└── README.md
```

`apps/web` ha due modalità. **Simulatore**: replica la UI WhatsApp, serve a registrare la demo se l'approvazione Meta non arriva in tempo. **Regia**: pannello che permette di far avanzare la data di sistema, forzare uno scenario e vedere in chiaro cosa sta leggendo l'agente. La regia non va mostrata a BASF, serve a te durante la registrazione.

---

## Quickstart

```bash
pnpm install
cp .env.example .env          # basta OPENROUTER_API_KEY
pnpm db:up                    # postgres
pnpm db:push
pnpm seed                     # idempotente, si può rilanciare
pnpm dev                      # api su :3001, web su :5173
```

### Test

```bash
pnpm test                     # unità, nessuna chiamata esterna
pnpm test:integration         # gate di fase, richiede db e OPENROUTER_API_KEY
```

I file `*.integration.test.ts` sono i gate: una fase della roadmap si chiude solo quando il suo gate è verde. Chi non ha la chiave OpenRouter vede i test LLM saltati, non falliti. Nei gate si usano solo modelli economici, una-tre chiamate ciascuno.

### Variabili d'ambiente

Elenco completo in `.env.example`. Le uniche indispensabili:

```
DATABASE_URL=
OPENROUTER_API_KEY=
DEMO_FREEZE_DATE=2026-08-09   # vedi sotto
```

`DEEPGRAM_API_KEY` è opzionale: senza, il simulatore manda direttamente il testo e `/capacita` lo dichiara. Le variabili `WHATSAPP_*` sono opzionali allo stesso modo: senza, si registra la demo dal simulatore.

**`DEMO_FREEZE_DATE` non è un dettaglio.** Nei grafici forniti da BASF la linea "oggi" cade sull'8 agosto e la curva di protezione sta scendendo sotto soglia proprio in quei giorni. È l'unico momento in cui il caso studio è vivo. A settembre, con data reale, la curva è piatta a zero e lo scenario 1 non funziona più. Tutta l'app legge la data da qui, mai da `new Date()`.

---

## Dati

Fonte: due file inviati da Martina Dal Cero (BASF) il 7 agosto 2026.

**`Caso_studio_2026.xlsx`**, sei fogli. Vigneto di Vidor (TV), Glera, 0,699 ha, zona Prosecco DOCG. 219 giorni di meteo (1 gennaio - 7 agosto 2026), 36 righe di trattamento su 13 date (18 aprile - 1 agosto), 5 fertilizzazioni. I due fogli di output modelli **non contengono dati**: solo dieci PNG incorporati.

**`Altri_casi_studio.pptx`**, tre slide immagine da Marano di Valpolicella e San Pietro in Cariano (Verona), zona diversa. Materiale di validazione: correlazione tra previsione DSS e osservazione in campo.

### Il vincolo che definisce l'architettura

BASF non fornisce serie numeriche, solo grafici renderizzati. I pacchetti `ingest` e `curves` ricostruiscono quindi le curve a partire da quello che c'è.

Ogni valore in `curva_dss` porta un campo `fonte` obbligatorio:

| `fonte` | Significato |
|---|---|
| `basf_export` | Numero esportato da BASF in tabella |
| `basf_dichiarazione_dss` | Stato categorico dichiarato dal DSS, senza percentuale |
| `basf_grafico_ancoraggio` | Punto certo letto dal grafico, tipicamente il reset a 100% dopo un trattamento |
| `vision_extraction` | Letto dal PNG con il modello vision |
| `ricostruzione` | Interpolato da noi fra due punti certi |

In riunione si deve poter dire con precisione quale numero viene da loro e quale è nostro. Il pannello di regia mostra la fonte accanto a ogni valore, così non si sbaglia in diretta. Senza questa distinzione la demo è attaccabile.

Il messaggio da portare a BASF è "leggiamo i vostri grafici perché non ci date i numeri", mai "abbiamo rifatto il vostro modello".

---

## Anomalie trovate nei dati BASF

Vengono marcate, non corrette. Sono il materiale della prima slide del report.

- Fase fenologica ferma su BBCH 105 dal 18 aprile al 18 maggio, mentre il grafico fenologico dello stesso file mostra il vigneto passare dalla 5a a circa la 14a foglia
- Folpan 80 WDG (folpet, multisito antiperonosporico) registrato contro oidio
- Foglio Fertilizzazione con "Tipo operazione" impostato su "Trattamento di difesa" su tutte le righe di concime
- Revysol (G1) applicato tre volte, due piretroidi IRAC 3 nella stessa stagione, nove applicazioni contenenti dithianon, senza alcun alert dal DSS

Dettaglio completo in [ROADMAP.md](./ROADMAP.md), Appendice B.

---

## Stato

Le sei fasi sono chiuse, ognuna dietro il proprio gate di integrazione. Vedi [ROADMAP.md](./ROADMAP.md) per le checkbox e per il registro delle richieste ancora aperte verso BASF.

Nessuna fase è bloccata in attesa di risposta: ogni dipendenza esterna ha un fallback già definito e dichiarato.

Per la registrazione della demo: [docs/copione-video.md](./docs/copione-video.md). Per la riunione: [docs/report-basf.md](./docs/report-basf.md).

---

## Contatti

Francesco Saverio Mazzi, Frasma Studio
francemazzi@gmail.com
