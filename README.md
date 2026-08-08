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
| LLM | Anthropic Claude (Sonnet per routing, Opus per spiegazione agronomica) |
| Vocale | Deepgram (italiano) |
| Vision | Claude vision, per foto sintomi ed estrazione curve dai grafici |
| Dati | PostgreSQL + Prisma |
| Canale | WhatsApp Business Cloud API, con simulatore React come fallback |
| Locale | Docker Compose |

---

## Struttura

```
basf_demo_agent/
├── apps/
│   ├── web/                 React: simulatore WhatsApp + pannello regia demo
│   └── api/                 Fastify: webhook, grafo LangGraph, adapter
├── packages/
│   ├── core/                Tipi di dominio, interfaccia AgrigeniusAdapter
│   ├── ingest/              Parser xlsx, estrazione curve dai PNG, seed
│   └── kb/                  Knowledge base prodotti e regole di conformità
├── data/
│   ├── raw/                 File originali BASF (gitignored)
│   ├── curves/              Serie temporali estratte dai grafici
│   └── seed/                JSON normalizzati
├── docs/
├── docker-compose.yml
├── ROADMAP.md
└── README.md
```

`apps/web` ha due modalità. **Simulatore**: replica la UI WhatsApp, serve a registrare la demo se l'approvazione Meta non arriva in tempo. **Regia**: pannello che permette di far avanzare la data di sistema, forzare uno scenario e vedere in chiaro cosa sta leggendo l'agente. La regia non va mostrata a BASF, serve a te durante la registrazione.

---

## Quickstart

```bash
pnpm install
cp .env.example .env          # riempi le chiavi
docker compose up -d          # postgres
pnpm --filter @basf/ingest db:migrate
pnpm --filter @basf/ingest seed
pnpm dev                      # api su :3001, web su :5173
```

### Variabili d'ambiente

```
DATABASE_URL=
ANTHROPIC_API_KEY=
DEEPGRAM_API_KEY=
WHATSAPP_TOKEN=               # opzionale, senza si usa il simulatore
WHATSAPP_PHONE_ID=
DEMO_FREEZE_DATE=2026-08-09   # vedi sotto
```

**`DEMO_FREEZE_DATE` non è un dettaglio.** Nei grafici forniti da BASF la linea "oggi" cade sull'8 agosto e la curva di protezione sta scendendo sotto soglia proprio in quei giorni. È l'unico momento in cui il caso studio è vivo. A settembre, con data reale, la curva è piatta a zero e lo scenario 1 non funziona più. Tutta l'app legge la data da qui, mai da `new Date()`.

---

## Dati

Fonte: due file inviati da Martina Dal Cero (BASF) il 7 agosto 2026.

**`Caso_studio_2026.xlsx`**, sei fogli. Vigneto di Vidor (TV), Glera, 0,699 ha, zona Prosecco DOCG. 219 giorni di meteo (1 gennaio - 7 agosto 2026), 36 righe di trattamento su 13 date (18 aprile - 1 agosto), 5 fertilizzazioni. I due fogli di output modelli **non contengono dati**: solo dieci PNG incorporati.

**`Altri_casi_studio.pptx`**, tre slide immagine da Marano di Valpolicella e San Pietro in Cariano (Verona), zona diversa. Materiale di validazione: correlazione tra previsione DSS e osservazione in campo.

### Il vincolo che definisce l'architettura

BASF non fornisce serie numeriche, solo grafici renderizzati. Il pacchetto `ingest` contiene quindi una pipeline vision che ricostruisce le curve dai PNG.

Ogni valore in `curva_dss` porta un campo `fonte` obbligatorio: `basf_export` oppure `vision_extraction`. In riunione si deve poter dire con precisione quale numero viene da loro e quale è ricostruito. Senza questa distinzione la demo è attaccabile.

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

Vedi [ROADMAP.md](./ROADMAP.md) per le fasi con checkbox e per il registro delle richieste ancora aperte verso BASF.

Nessuna fase è bloccata in attesa di risposta: ogni dipendenza esterna ha un fallback già definito.

---

## Contatti

Francesco Saverio Mazzi, Frasma Studio
francemazzi@gmail.com
