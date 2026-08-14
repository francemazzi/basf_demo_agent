# data/seed

CSV generati da `Caso_studio_2026.xlsx` e `Altri_casi_studio.pptx` (BASF, 7 agosto 2026).

Rigenera con:

```bash
python3 scripts/export_csv.py data/raw/Caso_studio_2026.xlsx data/seed
```

**Nessun valore è inventato.** Le colonne che richiedono una fonte esterna (limiti di etichetta, resistenza al dilavamento, curve dei modelli) sono vuote e vanno riempite in Fase 1 o Fase 2. Dove un valore è ricostruito, la colonna `fonte` lo dichiara.

---

## Dati primari, estratti dai fogli tabellari

| File | Righe | Contenuto |
|---|---|---|
| `appezzamento.csv` | 1 | Vidor loc. Cal Nova (TV), Glera, 0,699 ha, coordinate, cautela peronospora |
| `meteo_giornaliero.csv` | 219 | 1 gen - 7 ago 2026. Vento e radiazione vuoti fino al 23 marzo, campi nullable |
| `operazioni.csv` | 36 | Una riga per prodotto applicato. `id` = `YYYY-MM-DD-NN` |
| `principi_attivi.csv` | 42 | Esploso dal separatore pipe, con codice MOA, percentuale e CAS |
| `fertilizzazioni.csv` | 5 | Già marcate con l'anomalia `tipo_operazione_errato` |

## Dati derivati, calcolati dai primari

| File | Righe | Contenuto |
|---|---|---|
| `prodotti_kb.csv` | 22 | Un record per numero di registrazione. Colonne limiti da riempire |
| `conteggi_conformita.csv` | 27 | Applicazioni per principio attivo e per gruppo MOA sulla stagione |
| `pioggia_post_trattamento.csv` | 13 | Pioggia cumulata a 1, 2, 3 e 7 giorni da ogni data di trattamento |
| `anomalie.csv` | 8 | Registro delle anomalie con stato: confermata dai dati, da verificare, da confermare con BASF |

## Supporto alle fasi successive

| File | Righe | Contenuto |
|---|---|---|
| `indicazioni_dss.csv` | 22 | Vedi nota sotto. **Il file più importante dell'export** |
| `curve_dss.csv` | 26 | Solo punti di ancoraggio noti. Da riempire in Fase 1 |
| `validazione_estrazione.csv` | 6 | Valori attesi per misurare l'accuratezza della pipeline vision, più il sintomo osservato su Vidor |
| `bollettini.csv` + `bollettini/` | 14 | Bollettini vite 2026 della Regione del Veneto. Vedi nota sotto |

---

## Nota su `indicazioni_dss.csv`

La colonna `Indicazione DSS` del foglio Trattamenti non era stata considerata nella prima analisi. Contiene una lettura **categorica e strutturata** dello stato di protezione al momento di ogni intervento, in quattro stati:

- la protezione è sufficiente e lo resterà anche nei prossimi giorni
- la protezione non è sufficiente (o scenderà nei prossimi giorni), ma non sono previste infezioni
- la protezione non è sufficiente per le infezioni previste nei prossimi giorni
- la protezione residua garantirà solo una copertura parziale per le infezioni previste nei prossimi giorni

Sono dati reali BASF, non ricostruiti. Coprono 11 delle 13 date di trattamento, distinti per peronospora e oidio.

**Conseguenza pratica:** lo scenario 3 (dilavamento) e parte dello scenario 1 hanno una ground truth utilizzabile anche se l'estrazione vision delle curve non raggiunge una precisione accettabile. La Fase 1 passa da bloccante a migliorativa.

**Attenzione:** il campo è vuoto per il 20 luglio e per il 1 agosto, cioè le due date che servono allo scenario hero dell'8 agosto. Per quelle due serve l'estrazione dal grafico oppure il dato da BASF. È diventata la richiesta numero 1 del registro.

---

## Nota su `bollettini.csv` e `bollettini/`

Bollettini fitosanitari della vite emessi settimanalmente dalla U.O. Fitosanitario della Regione del Veneto, stagione 2026. Fonte indicata da BASF l'11 agosto 2026 in risposta alla richiesta n.3. Quattordici numeri dal 23 aprile al 6 agosto, testo estratto dai PDF pubblici, `url` conservato riga per riga.

**Sono regionali, non di zona.** Una sola serie copre tutto il Veneto, quindi vale anche per Vidor senza dover scegliere un areale.

Il valore vero di questa fonte non sono i consigli di difesa: è la riga **BBCH della Glera**, la varietà di Vidor, presente in ogni numero e distinta fra ambienti tardivi e precoci.

| Bollettino | Data | Glera, ambienti tardivi |
|---|---|---|
| n.4 | 29/04 | 15-55 (5a foglia ancora plausibile) |
| n.6 | 13/05 | 57-61 (fioritura) |
| n.7 | 20/05 | 57-61 |

Il quaderno dell'utente resta su "emissione 5a foglia" fino al 18 maggio. **Una fonte pubblica e terza dice che a quella data la Glera era in fioritura anche nell'ipotesi più tardiva.** È il terzo riscontro indipendente sull'anomalia del BBCH congelato, dopo il grafico fenologico di BASF e la conferma di Giorgio Fioretti, e l'unico che non passa da una nostra ricostruzione.

Il bollettino n.10 del 10 giugno, che copre il periodo 3-9 giugno, segnala inoltre nuove "macchie d'olio" di peronospora nei vigneti trattati e non: conferma indipendente dell'osservazione BASF del **9 giugno su Vidor**.

Attenzione a come si legge la riga: è un **intervallo regionale fra ambienti**, mai una misura sul singolo vigneto. Va citata come riferimento, non come verità di campo su Vidor.

---

## Convenzioni

- Date in ISO `YYYY-MM-DD`
- Decimali con punto, encoding UTF-8, separatore virgola
- Celle vuote significano dato assente, mai zero
- Il campo `fonte` su `curve_dss.csv` è obbligatorio: `basf_export`, `basf_grafico_ancoraggio` o `vision_extraction`. Serve a dire in riunione quale numero viene da BASF e quale è ricostruito
- `limiti_verificati = false` finché il limite di etichetta non è confermato su fonte ufficiale. In demo un limite inventato viene contestato

## Riservatezza

L'azienda è anonimizzata nel file sorgente ma le coordinate identificano l'appezzamento. Non pubblicare, non committare `data/raw/`.
