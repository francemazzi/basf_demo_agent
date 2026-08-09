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
| `validazione_estrazione.csv` | 5 | Valori attesi per misurare l'accuratezza della pipeline vision |

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

## Convenzioni

- Date in ISO `YYYY-MM-DD`
- Decimali con punto, encoding UTF-8, separatore virgola
- Celle vuote significano dato assente, mai zero
- Il campo `fonte` su `curve_dss.csv` è obbligatorio: `basf_export`, `basf_grafico_ancoraggio` o `vision_extraction`. Serve a dire in riunione quale numero viene da BASF e quale è ricostruito
- `limiti_verificati = false` finché il limite di etichetta non è confermato su fonte ufficiale. In demo un limite inventato viene contestato

## Riservatezza

L'azienda è anonimizzata nel file sorgente ma le coordinate identificano l'appezzamento. Non pubblicare, non committare `data/raw/`.
