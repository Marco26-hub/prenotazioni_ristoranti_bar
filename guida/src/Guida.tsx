import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * Guida a "Ordina e paga al tavolo".
 *
 * Le schermate sono catturate dalla produzione, non ridisegnate: una guida
 * illustrata a mano invecchia al primo ritocco dell'interfaccia e finisce per
 * insegnare qualcosa che non esiste più.
 *
 * Formato verticale 1080×1920: si guarda dal telefono, ed è anche il formato
 * in cui la si manda su WhatsApp a un ristoratore.
 */

export const DURATA_TITOLO = 75;
export const DURATA_PASSO = 105;
export const DURATA_CHIUSURA = 90;

const SFONDO = "#141110";
const ACCENTO = "#e2703a";
const CHIARO = "#f6f1ec";

export interface Passo {
  src: string;
  didascalia: string;
  larghezza: number;
  altezza: number;
}

const font =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Il titolo, tenuto corto: chi guarda decide nei primi due secondi. */
const Titolo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SFONDO,
        justifyContent: "center",
        alignItems: "center",
        padding: 110,
        textAlign: "center",
        fontFamily: font,
      }}
    >
      <div style={{ transform: `translateY(${(1 - s) * 40}px)`, opacity: s }}>
        <p
          style={{
            color: ACCENTO,
            fontSize: 44,
            letterSpacing: 8,
            textTransform: "uppercase",
            margin: 0,
            fontWeight: 600,
          }}
        >
          Guida rapida
        </p>
        <h1
          style={{
            color: CHIARO,
            fontSize: 128,
            lineHeight: 1.05,
            margin: "28px 0 0",
            fontWeight: 800,
            letterSpacing: -3,
          }}
        >
          Ordina e paga
          <br />
          al tavolo
        </h1>
        <p style={{ color: "#a89e97", fontSize: 46, marginTop: 44 }}>
          Dal QR al conto, senza aspettare nessuno
        </p>
      </div>
    </AbsoluteFill>
  );
};

const Schermata: React.FC<{ passo: Passo; numero: number; totale: number }> = ({
  passo,
  numero,
  totale,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 200 } });

  const verticale = passo.altezza > passo.larghezza;

  /*
   * Le schermate vanno lette, non ammirate.
   *
   * Prima stavano in una cornice larga metà fotogramma con la didascalia
   * sotto: su un telefono il testo dell'interfaccia diventava illeggibile,
   * che è l'unica cosa che una guida deve fare.
   *
   * Ora l'immagine occupa quasi tutta la larghezza. Una schermata di telefono
   * così larga è più alta del fotogramma: la parte in eccesso non si butta,
   * ci si scorre sopra piano per tutta la durata del passo — che è anche il
   * modo in cui la si guarderebbe davvero.
   */
  const larghezzaImg = verticale ? width * 0.93 : width * 0.98;
  const altezzaImg = (larghezzaImg / passo.larghezza) * passo.altezza;
  const eccedenza = Math.max(0, altezzaImg - height * 0.86);

  const scorrimento = interpolate(frame, [0, DURATA_PASSO], [0, -eccedenza], {
    extrapolateRight: "clamp",
  });

  // Sulle schermate orizzontali non c'è niente da scorrere: si avvicina
  // appena, per non lasciarle immobili.
  const zoom = verticale
    ? 1
    : interpolate(frame, [0, DURATA_PASSO], [1, 1.06], { extrapolateRight: "clamp" });

  const uscita = interpolate(frame, [DURATA_PASSO - 12, DURATA_PASSO], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ backgroundColor: SFONDO, fontFamily: font, opacity: uscita }}
    >
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: verticale ? "flex-start" : "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            transform: `translateY(${(1 - entra) * 50 + (verticale ? scorrimento : 0)}px) scale(${zoom})`,
            opacity: entra,
            borderRadius: verticale ? 40 : 24,
            overflow: "hidden",
            // Cornice sottile: senza, una schermata chiara si fonde con lo
            // sfondo e non si capisce dove finisce lo schermo.
            border: "3px solid rgba(255,255,255,.16)",
            boxShadow: "0 40px 90px rgba(0,0,0,.55)",
            width: larghezzaImg,
            marginTop: verticale ? 40 : 0,
          }}
        >
          <Img src={passo.src} style={{ width: "100%", display: "block" }} />
        </div>
      </AbsoluteFill>

      {/* La didascalia sta sopra l'immagine, su una sfumatura: sotto rubava
          l'altezza che serve a rendere leggibile la schermata. */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div
          style={{
            padding: "180px 80px 110px",
            background:
              "linear-gradient(to top, rgba(20,17,16,.98) 42%, rgba(20,17,16,.85) 68%, rgba(20,17,16,0))",
          }}
        >
          <p
            style={{
              color: ACCENTO,
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: 4,
              margin: 0,
            }}
          >
            {numero} / {totale}
          </p>
          <p
            style={{
              color: CHIARO,
              fontSize: 58,
              lineHeight: 1.26,
              margin: "16px 0 0",
              fontWeight: 600,
              textWrap: "balance",
            }}
          >
            {passo.didascalia}
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Chiusura: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SFONDO,
        justifyContent: "center",
        alignItems: "center",
        padding: 110,
        textAlign: "center",
        fontFamily: font,
      }}
    >
      <div style={{ opacity: s, transform: `scale(${0.94 + s * 0.06})` }}>
        <h2
          style={{
            color: CHIARO,
            fontSize: 96,
            lineHeight: 1.1,
            margin: 0,
            fontWeight: 800,
            letterSpacing: -2,
          }}
        >
          Il tavolo gira,
          <br />
          la cassa torna
        </h2>
        <p style={{ color: "#a89e97", fontSize: 46, marginTop: 40 }}>
          Nessuna app da scaricare, per il cliente.
          <br />
          Nessuna percentuale trattenuta, per te.
        </p>
      </div>
    </AbsoluteFill>
  );
};

export const Guida: React.FC<{ passi: Passo[] }> = ({ passi }) => (
  <AbsoluteFill style={{ backgroundColor: SFONDO }}>
    <Sequence durationInFrames={DURATA_TITOLO}>
      <Titolo />
    </Sequence>

    {passi.map((passo, i) => (
      <Sequence
        key={passo.src}
        from={DURATA_TITOLO + i * DURATA_PASSO}
        durationInFrames={DURATA_PASSO}
      >
        <Schermata passo={passo} numero={i + 1} totale={passi.length} />
      </Sequence>
    ))}

    <Sequence
      from={DURATA_TITOLO + passi.length * DURATA_PASSO}
      durationInFrames={DURATA_CHIUSURA}
    >
      <Chiusura />
    </Sequence>
  </AbsoluteFill>
);
