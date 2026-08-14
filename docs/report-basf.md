# Report per BASF Italia — otto slide

Il pacchetto deve reggere in una riunione **senza Francesco presente**: chi legge deve capire tutto dalle slide, senza voce che spiega. Ogni numero qui dentro viene dal caso studio del 7 agosto, dal PPT di Marano o dalle risposte di Giorgio Fioretti dell'11 agosto. Dove il numero è nostro, la slide lo dichiara.

Prima della call va chiarito se il referente è Maurizio o Moritz. Il nome sbagliato sulla prima slide costa più di un errore tecnico.

---

## Slide 1 — Quanto costa un campo compilato a mano

Apre il report. Non è una provocazione: è la prova che i dati sono stati letti riga per riga. E la spiegazione di ogni riga arriva da BASF, non da noi.

| Rilievo | Dove | Stato |
|---|---|---|
| Fase fenologica ferma su BBCH 105 dal 18/04 al 18/05, 12 righe su 5 date, mentre il vostro grafico mostra il passaggio dalla 5a a circa la 14a foglia | Operazioni | Spiegato da BASF, 11/08 |
| BBCH 71 invariato dal 04/06 al 10/07 | Operazioni | Spiegato da BASF, 11/08 |
| Folpan 80 WDG, folpet multisito antiperonosporico, registrato contro oidio il 04/06 e il 23/06 | Operazioni | Refuso in inserimento. Il DSS non poteva intercettarlo: l'oidio è in etichetta |
| Foglio Fertilizzazione con "Trattamento di difesa / Fitoregolatori" su tutte e 5 le righe di concime | Fertilizzazioni | Confermato dai dati |
| Vivando senza codice FRAC per il metrafenone | Principi attivi | Confermato dai dati |
| Camplan SC con cymoxanil marcato "SC": il cymoxanil è FRAC 27, "SC" sembra una sigla di formulazione finita nel campo sbagliato | Principi attivi | Da verificare |
| Envita SC (17422) ed Envita (19119): stesso dithianon, due registrazioni, conteggi separati | Prodotti | Confermato dai dati |

**Perché il BBCH resta fermo — parole vostre, Giorgio Fioretti, 11 agosto:**

- il sistema calcola la fenologia, ma la chiede comunque all'utente *"come ulteriore riscontro di quanto calcolato"*;
- la funzione **Duplica operazione** riparte dall'ultima operazione inserita e trascina i campi che l'utente non modifica;
- sulla vite l'emissione di ogni singola foglia interessa a chi fa monitoraggi territoriali, non all'azienda agricola: l'utente aggiorna la fase solo alla fioritura.

**Il riscontro che non passa da noi.** I bollettini della Regione del Veneto che ci avete segnalato pubblicano ogni settimana la fase della Glera, la varietà di Vidor:

| Bollettino | Data | Glera, ambienti tardivi | Il quaderno dice |
|---|---|---|---|
| n. 4 | 29 aprile | 15-55, quinta foglia ancora plausibile | emissione 5a foglia |
| n. 6 | 13 maggio | 57-61, fioritura | emissione 5a foglia |
| n. 7 | 20 maggio | 57-61, fioritura | emissione 5a foglia |

Anche prendendo l'ipotesi più tardiva del Veneto, il 13 maggio la Glera era in fioritura. Il quaderno resta sulla quinta foglia fino al 18. **Questo non è il nostro grafico ricostruito né la nostra interpretazione: è una fonte pubblica, terza, indicata da voi.**

Nessuno di questi rilievi è un difetto del DSS, e **nessuno è stato corretto in automatico.** Sono marcati e mostrati. Sono il prezzo di un campo compilato a mano, misurato su un caso reale.

---

## Slide 2 — I tre limiti, detti da voi

1. L'inserimento dei trattamenti è troppo oneroso, quindi l'utente compila male o smette
2. Non esiste quaderno di campagna né magazzino, per scelta di prodotto
3. Non ci sono alert su intervalli e resistenze quando le applicazioni si ripetono

Il BBCH fermo un mese sulla slide precedente è il limite 1 che si vede nei dati. Non è più un'ipotesi di mercato: **Duplica operazione esiste perché inserire un trattamento da zero costa troppo**, e il campo che si trascina è la prova che la scorciatoia viene usata.

La conferma di come funziona ce l'avete data voi. Noi abbiamo solo misurato quanto dura.

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

Lo **scenario 3 non è un'ipotesi**: è la domanda che il vostro tecnico dice di ricevere più di ogni altra — *"quando devo trattare"*, cioè come posizionarsi fra un evento piovoso e il successivo.

---

## Slide 4 — Il campo che state per togliere

Ci avete detto che nella nuova interfaccia la fase fenologica sparirà dal momento di inserimento del trattamento. È la decisione giusta, e non toglie niente a quanto sopra. Toglie il sintomo, non il costo:

- restano da compilare prodotto, dose, superficie, data e avversità: l'inserimento resta oneroso, e le altre righe della slide 1 restano possibili;
- soprattutto, **perdete il riscontro di campo**. Quel campo, dite voi, serviva come verifica di quanto il modello calcola. Togliendolo il modello fenologico smette di ricevere conferme dall'utente.

Non dovete scegliere fra le due cose. L'agente non chiede la fase e allo stesso tempo ve la restituisce, perché la deduce da una frase parlata e dalla foto. Zero attrito e riscontro di campo, insieme.

---

## Slide 5 — Il vincolo che ha definito l'architettura

I due fogli di output dei modelli nel file che ci avete mandato **non contengono numeri**: contengono dieci PNG.

L'11 agosto ci avete confermato che non è un limite dell'export, è come sono fatti i modelli:

- il **rischio infettivo** non è un numero, è un cruscotto a colori per livello di rischio;
- la **protezione residua** è, testualmente, *"praticamente impossibile"* da fornire come serie, perché si rigenera a ogni trattamento tenendo conto dell'effetto accumulo del precedente.

Quindi la pipeline che rilegge le curve dai grafici non è un ripiego in attesa dei numeri: è l'architettura definitiva finché non c'è un accesso diretto al cruscotto. Ogni valore in banca dati porta un campo `fonte` obbligatorio, così in riunione si può dire con precisione quale numero è vostro e quale è ricostruito da noi. Il valore `basf_dichiarazione_dss` — stato categorico senza percentuale — esiste esattamente perché il vostro rischio è categorico.

Il messaggio è "leggiamo i vostri grafici perché i numeri non esistono in quella forma", mai "abbiamo rifatto il vostro modello".

A schermo va lo screenshot del cruscotto di rischio che ci avete allegato l'11 agosto: è la prova visiva che il dato è categorico all'origine, non impoverito da noi.

---

## Slide 6 — Quanto è accurata la ricostruzione

Confronto con i valori certi letti nei tooltip della slide 2 del vostro PPT (Marano di Valpolicella).

Le serie coperte oggi sono le curve di protezione e la fenologia su Vidor. Le cinque righe di validazione su Marano restano scoperte: **nessuna fonte disponibile le contiene**, e ora sappiamo che nessuna fonte le conterrà mai in forma numerica.

Il riscontro che conta di più è però su Vidor, e ce l'avete dato voi: **primi sintomi di peronospora osservati il 9 giugno**. È il campo giusto, la stagione giusta, con il trattamento del 4 giugno dentro la finestra. Sostituisce il delta di tre giorni misurato su Marano, che resta come secondo riscontro su un'altra zona.

E ha una conferma indipendente: il bollettino regionale n. 10, che copre il periodo 3-9 giugno, segnala nuove "macchie d'olio" di peronospora nei vigneti sia trattati sia non trattati. Due fonti diverse, la stessa settimana.

Tabella completa e aggiornata in `docs/accuratezza-estrazione.md`. La slide riporta la tabella, non un giudizio.

Questa slide va tenuta anche se è scomoda. È quella che rende credibili le altre.

---

## Slide 7 — Cosa cambia per il vostro business

- Il dato di campo torna a essere affidabile: se compilare costa una frase parlata, l'utente compila
- Il quaderno di campagna e il magazzino esistono senza diventare un modulo da imparare
- Gli alert su resistenze e ripetizioni sono un motivo per restare abbonati, non una funzione in più
- Il canale è WhatsApp: sul target over 60 è l'unica interfaccia con adozione già al 100%

Nessuna di queste quattro cose richiede di cambiare Agrigenius. Richiede di aprirlo.

---

## Slide 8 — Cosa ci serve da voi

Delle sei richieste dell'8 agosto, quattro le avete chiuse l'11 agosto: osservazioni di sintomo, bollettini, domande reali dell'agricoltore e natura dei rilievi della slide 1. Tutto quello che avete visto finora gira su quelle risposte. Una l'avete chiusa spiegandoci perché non è possibile, e l'abbiamo tolta. Resta questa, più una che non vi avevamo ancora chiesto.

| # | Richiesta | Perché | Se non arriva |
|---|---|---|---|
| 1 | Accesso alla demo del DSS e una sandbox | Leggere il cruscotto di rischio in diretta invece di ricostruirlo dai grafici | Continuiamo sul mock, con la fonte dichiarata slide per slide |
| 2 | Un utente reale per la validazione | La prova che serve prima di parlare di prodotto | Nessun fallback: questa manca e basta |

Le serie numeriche non ve le chiediamo più: ci avete spiegato perché non esistono in quella forma, e l'architettura ne ha già preso atto.

L'adapter ha già due implementazioni con la stessa suite di test. Il giorno che arriva la sandbox, l'agente non se ne accorge.

**Next step proposto:** due settimane per collegare l'adapter HTTP alla sandbox, poi una sessione con un viticoltore vero.
