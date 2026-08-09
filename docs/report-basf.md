# Report per BASF Italia — sette slide

Il pacchetto deve reggere in una riunione **senza Francesco presente**: chi legge deve capire tutto dalle slide, senza voce che spiega. Ogni numero qui dentro viene dal caso studio del 7 agosto o dal PPT di Marano. Dove il numero è nostro, la slide lo dichiara.

Prima della call va chiarito se il referente è Maurizio o Moritz. Il nome sbagliato sulla prima slide costa più di un errore tecnico.

---

## Slide 1 — Cosa abbiamo trovato nei vostri dati

Apre il report. Non è una provocazione: è la prova che i dati sono stati letti riga per riga.

| Anomalia | Dove | Stato |
|---|---|---|
| Fase fenologica ferma su BBCH 105 dal 18/04 al 18/05, 12 righe su 5 date, mentre il vostro grafico mostra il passaggio dalla 5a a circa la 14a foglia | Operazioni | Da confermare |
| BBCH 71 invariato dal 04/06 al 10/07 | Operazioni | Da confermare |
| Folpan 80 WDG, folpet multisito antiperonosporico, registrato contro oidio il 04/06 e il 23/06 | Operazioni | Da confermare |
| Foglio Fertilizzazione con "Trattamento di difesa / Fitoregolatori" su tutte e 5 le righe di concime | Fertilizzazioni | Confermata dai dati |
| Vivando senza codice FRAC per il metrafenone | Principi attivi | Confermata dai dati |
| Camplan SC con cymoxanil marcato "SC": il cymoxanil è FRAC 27, "SC" sembra una sigla di formulazione finita nel campo sbagliato | Principi attivi | Da verificare |
| Envita SC (17422) ed Envita (19119): stesso dithianon, due registrazioni, conteggi separati | Prodotti | Confermata dai dati |

Nota a fondo slide: **nessuna anomalia è stata corretta in automatico.** Sono marcate e mostrate.

---

## Slide 2 — I tre limiti, detti da voi

1. L'inserimento dei trattamenti è troppo oneroso, quindi l'utente compila male o smette
2. Non esiste quaderno di campagna né magazzino, per scelta di prodotto
3. Non ci sono alert su intervalli e resistenze quando le applicazioni si ripetono

Il BBCH fermo un mese sulla slide precedente è il limite 1 che si vede nei dati. Non è un'ipotesi di mercato.

---

## Slide 3 — Cosa abbiamo fatto sui vostri dati

Un agente su WhatsApp sopra Agrigenius. Cinque scenari, tutti girati sul vigneto di Vidor.

| # | Scenario | Il limite che chiude |
|---|---|---|
| 1 | L'agente apre da solo il 9 agosto: copertura sotto soglia, BBCH 81, otto giorni dall'ultimo intervento | 3 |
| 2 | "Ho dato zolfo e rame stamattina su tutto" diventa due righe di quaderno, superficie e BBCH dedotti | 1 |
| 3 | 22,3 mm dopo il trattamento del 10 maggio: ricalcolo e raccomandazione, non un sì secco | 3 |
| 4 | Foto del sintomo: finestra di giorni con incertezza dichiarata, mai una data | — |
| 5 | Terza applicazione di Revysol intercettata prima della conferma, quaderno in PDF, magazzino | 2 e 3 |

Il viticoltore non installa niente, non impara niente, non compila niente. Scrive o parla in una chat che usa già.

---

## Slide 4 — Il vincolo che ha definito l'architettura

I due fogli di output dei modelli nel file che ci avete mandato **non contengono numeri**: contengono dieci PNG.

Meteo e trattamenti sono usciti in tabella senza problemi. Quindi il limite non è la piattaforma, è il rendering dell'output dei modelli.

Conseguenza: abbiamo una pipeline che rilegge le curve dai grafici. Ogni valore in banca dati porta un campo `fonte` obbligatorio, così in riunione si può dire con precisione quale numero è vostro e quale è ricostruito da noi.

Il messaggio è "leggiamo i vostri grafici perché non ci date i numeri", mai "abbiamo rifatto il vostro modello".

---

## Slide 5 — Quanto è accurata la ricostruzione

Confronto con i valori certi letti nei tooltip della slide 2 del vostro PPT (Marano di Valpolicella).

Le serie coperte oggi sono le curve di protezione e la fenologia su Vidor. Le cinque righe di validazione su Marano restano scoperte: **nessuna fonte disponibile le contiene**, ed è esattamente la richiesta numero 1 della slide finale.

Tabella completa e aggiornata in `docs/accuratezza-estrazione.md`. La slide riporta la tabella, non un giudizio.

Questa slide va tenuta anche se è scomoda. È quella che rende credibili le altre.

---

## Slide 6 — Cosa cambia per il vostro business

- Il dato di campo torna a essere affidabile: se compilare costa una frase parlata, l'utente compila
- Il quaderno di campagna e il magazzino esistono senza diventare un modulo da imparare
- Gli alert su resistenze e ripetizioni sono un motivo per restare abbonati, non una funzione in più
- Il canale è WhatsApp: sul target over 60 è l'unica interfaccia con adozione già al 100%

Nessuna di queste quattro cose richiede di cambiare Agrigenius. Richiede di aprirlo.

---

## Slide 7 — Cosa ci serve da voi

| # | Richiesta | Perché | Se non arriva |
|---|---|---|---|
| 1 | Serie numeriche di rischio infezione e protezione % su Vidor | Togliere la ricostruzione dal percorso | Restiamo su vision, con la fonte dichiarata |
| 2 | Osservazioni di sintomo su Vidor con le date | Validare la finestra di comparsa sul campo giusto | Usiamo il dato di Marano |
| 3 | Bollettini di zona in formato testo | Incrociare il modello con l'avviso ufficiale | Solo output DSS |
| 4 | Tre o quattro domande reali di un agricoltore | Smettere di immaginare gli scenari | Restiamo sui pain emersi in call |
| 5 | Natura delle anomalie: export o inserimento utente | Sapere se la slide 1 è un bug o un comportamento | Le presentiamo come da confermare |
| 6 | Accesso alla demo del DSS e una sandbox | Sostituire il mock con l'adapter HTTP | Continuiamo sul mock |
| 7 | Un utente reale per la validazione | La prova che serve prima di parlare di prodotto | Nessun fallback: questa manca e basta |

L'adapter ha già due implementazioni con la stessa suite di test. Il giorno che arrivano le API, l'agente non se ne accorge.

**Next step proposto:** due settimane per collegare l'adapter HTTP alla sandbox, poi una sessione con un viticoltore vero.
