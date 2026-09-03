import { Composition, staticFile } from "remotion";
import { Guida, DURATA_PASSO, DURATA_TITOLO, DURATA_CHIUSURA } from "./Guida";
import passi from "./passi.json";

export const FPS = 30;

/**
 * La durata non è scritta a mano: dipende da quanti passi ha catturato lo
 * script. Rifacendo la cattura con un passo in più il video si allunga da
 * solo, invece di tagliare l'ultima schermata.
 */
export const Root: React.FC = () => (
  <Composition
    id="guida"
    component={Guida}
    durationInFrames={
      DURATA_TITOLO + passi.length * DURATA_PASSO + DURATA_CHIUSURA
    }
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{
      passi: passi.map((p) => ({ ...p, src: staticFile(p.immagine) })),
    }}
  />
);
