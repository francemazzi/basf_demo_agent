import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { accedi, registra } from "./api.js";

export function Accedi() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [inAttesa, setInAttesa] = useState(false);

  async function onSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErrore(null);
    setInAttesa(true);
    try {
      if (modo === "register") await registra(email, password);
      else await accedi(email, password);
      navigate("/chat");
    } catch (causa) {
      setErrore(causa instanceof Error ? causa.message : "Accesso non riuscito");
    } finally {
      setInAttesa(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-md flex-col justify-center overflow-x-clip pt-[max(2.5rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6 sm:py-16 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <p className="text-[0.65rem] uppercase tracking-[0.14em] break-words text-vigna-600 sm:text-xs sm:tracking-[0.2em]">
        Accesso riservato
      </p>
      <h1 className="mt-3 font-display text-3xl sm:text-4xl">Entra nella chat</h1>
      <p className="mt-3 text-sm leading-relaxed break-words text-pietra-700">
        Solo gli indirizzi BASF e il titolare del prototipo. Stessi dati di Vidor, storico
        persistente.
      </p>

      <div className="mt-8 flex min-w-0 gap-2">
        <button
          type="button"
          onClick={() => setModo("login")}
            className={
              modo === "login"
                ? "min-h-11 min-w-0 flex-1 rounded-xl bg-vigna-800 px-3 py-2 text-sm text-pietra-50 sm:px-4"
                : "min-h-11 min-w-0 flex-1 rounded-xl border border-pietra-200 px-3 py-2 text-sm text-pietra-700 sm:px-4"
            }
        >
          Accedi
        </button>
        <button
          type="button"
          onClick={() => setModo("register")}
            className={
              modo === "register"
                ? "min-h-11 min-w-0 flex-1 rounded-xl bg-vigna-800 px-3 py-2 text-sm text-pietra-50 sm:px-4"
                : "min-h-11 min-w-0 flex-1 rounded-xl border border-pietra-200 px-3 py-2 text-sm text-pietra-700 sm:px-4"
            }
        >
          Registrati
        </button>
      </div>

      <form className="mt-6 flex flex-col gap-4" onSubmit={(evento) => void onSubmit(evento)}>
        <label className="text-sm text-pietra-700">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            autoComplete="username"
            className="mt-1 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-pietra-200 bg-white px-4 py-2 text-vigna-950 outline-none focus:border-vigna-600"
          />
        </label>
        <label className="text-sm text-pietra-700">
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            autoComplete={modo === "register" ? "new-password" : "current-password"}
            className="mt-1 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-pietra-200 bg-white px-4 py-2 text-vigna-950 outline-none focus:border-vigna-600"
          />
        </label>
        {errore && <p className="text-sm text-ambra-500">{errore}</p>}
        <button
          type="submit"
          disabled={inAttesa}
          className="min-h-11 rounded-xl bg-vigna-800 px-4 py-2.5 text-sm text-pietra-50 transition hover:bg-vigna-600 disabled:opacity-40"
        >
          {inAttesa ? "Un attimo…" : modo === "register" ? "Crea l’accesso" : "Entra"}
        </button>
      </form>

      <Link to="/" className="mt-8 text-sm text-pietra-700 underline-offset-2 hover:underline">
        Torna alla demo WhatsApp
      </Link>
    </div>
  );
}
