import type {
  AgrigeniusAdapter,
  Alert,
  Avversita,
  DilavamentoResult,
  EsitoRegistrazione,
  FenologiaResult,
  FinestraSintomi,
  Operazione,
  OperazionePayload,
  ProtezioneResult,
  RischioResult,
} from "@basf/core";

/**
 * Stessa interfaccia del mock, sopra HTTP. Oggi punta alla nostra API; il giorno
 * in cui BASF apre le API di Agrigenius cambia solo la base URL e il mapping.
 */
export class HttpAgrigeniusAdapter implements AgrigeniusAdapter {
  constructor(
    private readonly baseUrl: string,
    private readonly appezzamentoId: string = "vidor-cal-nova",
  ) {}

  getAppezzamentoId(): string {
    return this.appezzamentoId;
  }

  getProtezione(giorno: string, avversita: Avversita): Promise<ProtezioneResult> {
    return this.get("/dss/protezione", { giorno, avversita });
  }

  getRischio(giorno: string, avversita: Avversita): Promise<RischioResult> {
    return this.get("/dss/rischio", { giorno, avversita });
  }

  getFenologia(giorno: string): Promise<FenologiaResult> {
    return this.get("/dss/fenologia", { giorno });
  }

  getAlert(giorno: string): Promise<Alert[]> {
    return this.get("/dss/alert", { giorno });
  }

  getDilavamento(giorno: string, avversita: Avversita): Promise<DilavamentoResult> {
    return this.get("/dss/dilavamento", { giorno, avversita });
  }

  getFinestraSintomi(giornoInfezione: string, avversita: Avversita): Promise<FinestraSintomi> {
    return this.get("/dss/finestra-sintomi", { giorno: giornoInfezione, avversita });
  }

  getOperazioni(fino?: string): Promise<Operazione[]> {
    return this.get("/operazioni", fino ? { fino } : {});
  }

  registraOperazione(payload: OperazionePayload): Promise<EsitoRegistrazione> {
    return this.post("/operazioni", payload);
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${path} ha risposto ${response.status}`);
    return (await response.json()) as T;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(new URL(path, this.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${path} ha risposto ${response.status}`);
    return (await response.json()) as T;
  }
}
