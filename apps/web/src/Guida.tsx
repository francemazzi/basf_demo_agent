interface Props {
  aperta: boolean;
  onChiudi: () => void;
}

export function Guida({ aperta, onChiudi }: Props) {
  if (!aperta) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-vigna-950/40"
        aria-label="Chiudi la guida"
        onClick={onChiudi}
      />
      <aside
        role="dialog"
        aria-labelledby="guida-titolo"
        className="relative flex h-full w-full max-w-md min-w-0 flex-col overflow-y-auto border-l border-pietra-200 bg-pietra-50 px-5 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-7"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="guida-titolo" className="min-w-0 font-display text-3xl text-vigna-950">
            Come si usa
          </h2>
          <button
            type="button"
            onClick={onChiudi}
            className="min-h-11 shrink-0 rounded-lg px-3 text-sm text-pietra-700 transition hover:text-vigna-800"
          >
            Chiudi
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-pietra-700">
          Questo è il simulatore WhatsApp della demo. Gira sui dati del vigneto di Vidor che BASF
          ha inviato il 7 agosto. Le risposte passano da OpenRouter e dai modelli Agrigenius Vite,
          non da un chatbot generico.
        </p>

        <h3 className="mt-8 font-display text-xl">I tre tasti data</h3>
        <p className="mt-2 text-sm leading-relaxed text-pietra-700">
          Ogni data è uno scenario. Cambiarla svuota la chat e fa ripartire l’assistente da quel
          giorno. Non mescolare gli scenari nella stessa conversazione.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-vigna-950">
          <li>
            <span className="font-medium">9 ago</span> — l’agente scrive per primo, poi si registra
            un trattamento.
          </li>
          <li>
            <span className="font-medium">11 mag</span> — domanda sulla pioggia dopo il trattamento
            del 10 maggio.
          </li>
          <li>
            <span className="font-medium">4 giu</span> — «posso dare Revysion oggi?» prima della
            terza applicazione.
          </li>
        </ul>

        <h3 className="mt-8 font-display text-xl">Cosa scrivere</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-vigna-950">
          <li>Su 9 ago, non scrivere: aspetta il messaggio di apertura.</li>
          <li>
            Poi: <em>Ho dato zolfo e rame stamattina su tutto</em>
          </li>
          <li>
            Su 11 mag: <em>Ha piovuto stanotte, sono ancora coperto?</em>
          </li>
          <li>
            Su 9 ago: <em>Quando vedrò i sintomi?</em>
          </li>
          <li>
            Su 4 giu: <em>Posso dare Revysion oggi?</em>
          </li>
        </ol>

        <p className="mt-6 text-sm leading-relaxed text-pietra-700">
          In questa pagina non c’è il microfono: le battute si scrivono o si cliccano sotto la
          chat. La regia sta sotto il telefono sul cellulare, a destra sul computer: utile a chi
          registra, da non mostrare in una call BASF.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-pietra-700">
          Se hai un indirizzo BASF puoi accedere e continuare in una chat con storico, sugli
          stessi dati.
        </p>
      </aside>
    </div>
  );
}
