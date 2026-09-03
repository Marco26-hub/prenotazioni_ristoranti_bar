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
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 200 } });

  // Una risalita lentissima per tutta la durata: tiene viva l'inquadratura
  // su un'immagine ferma senza rubare l'attenzione al testo.
  const deriva = interpolate(frame, [0, DURATA_PASSO], [0, -26]);
  const uscita = interpolate(
    frame,
    [DURATA_PASSO - 12, DURATA_PASSO],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SFONDO,
        fontFamily: font,
        opacity: uscita,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 90,
        }}
      >
        <div
          style={{
            transform: `translateY(${(1 - entra) * 60 + deriva}px)`,
            opacity: entra,
            borderRadius: 44,
            overflow: "hidden",
            // Cornice sottile: senza, una schermata chiara si fonde con lo
            // sfondo e non si capisce dove finisce lo schermo.
            border: "3px solid rgba(255,255,255,.14)",
            boxShadow: "0 40px 90px rgba(0,0,0,.55)",
            maxHeight: 1180,
          }}
        >
          <Img src={passo.src} style={{ width: 560, display: "block" }} />
        </div>
      </div>

      <div style={{ padding: "0 90px 130px" }}>
        <p
          style={{
            color: ACCENTO,
            fontSize: 38,
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
            fontSize: 56,
            lineHeight: 1.28,
            margin: "18px 0 0",
            fontWeight: 600,
            textWrap: "balance",
          }}
        >
          {passo.didascalia}
        </p>
      </div>
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
