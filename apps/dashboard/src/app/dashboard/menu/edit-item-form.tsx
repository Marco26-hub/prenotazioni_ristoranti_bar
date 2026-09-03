"use client";

import { AllergeniFlag } from "./allergeni-flag";
import { useEffect, useState, useTransition } from "react";
import { useRef } from "react";
import { updateMenuItem } from "./actions";
import { EtichettaForm } from "./etichetta-form";
import {
  TIPO_ETICHETTA,
  CONSERVAZIONE_ETICHETTA,
  type TipoVoce,
  type Conservazione,
} from "@repo/shared/bevande";

export interface EditableItem {
  id: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  price_cents: number;
  vat_rate: string | number;
  fuori_formula?: boolean;
  category_id: string | null;
  pairing_item_id: string | null;
  allergens: string[] | null;
  dietary_tags: string[] | null;
  available: boolean;
  kind: TipoVoce;
  producer: string | null;
  vintage: number | null;
  denomination: string | null;
  origin: string | null;
  abv: number | string | null;
  serving_note: string | null;
  subcategory: string | null;
  product_style: string | null;
  format: string | null;
  grape_variety: string | null;
  service_type: string | null;
  conservation: Conservazione;
  origin_note: string | null;
}

const FIELD =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";
const LABEL = "block text-xs font-medium text-muted";

/**
 * Modifica di un piatto, chiusa di default.
 *
 * Un menu ha decine di piatti: tenere tutti i form aperti renderebbe la
 * pagina illeggibile proprio a chi deve trovarne uno solo.
 */
export function EditItemForm({
  item,
  categories,
  otherItems,
  letturaEtichettaAttiva = false,
  apriSubito = false,
  mostraFormula = false,
}: {
  item: EditableItem;
  categories: Array<{ id: string; name: string }>;
  otherItems: Array<{ id: string; name: string }>;
  letturaEtichettaAttiva?: boolean;
  /** La copia appena creata si apre da sola: serve a essere modificata. */
  apriSubito?: boolean;
  /**
   * La spunta "fuori formula" compare solo se il locale una formula ce
   * l'ha: altrove sarebbe una casella che non fa niente.
   */
  mostraFormula?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(apriSubito);
  const [tipo, setTipo] = useState<TipoVoce>(item.kind);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nomeRef = useRef<HTMLInputElement>(null);

  // Su una copia appena fatta il nome è "Copia di …": selezionarlo permette
  // di riscriverlo subito, senza cancellarlo a mano carattere per carattere.
  useEffect(() => {
    if (!apriSubito) return;
    nomeRef.current?.focus();
    nomeRef.current?.select();
  }, [apriSubito]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex min-h-11 items-center px-1 text-sm underline"
      >
        Modifica
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        setMessage(null);
        start(async () => {
          const res = await updateMenuItem(formData);
          if (res.error) setError(res.error);
          else {
            setMessage("Salvato");
            setOpen(false);
          }
        });
      }}
      className="mt-3 space-y-3 rounded-lg border border-border p-3"
    >
      <input type="hidden" name="itemId" value={item.id} />

      <div>
        <label className={LABEL} htmlFor={`name-${item.id}`}>
          Nome
        </label>
        <input
          ref={nomeRef}
          id={`name-${item.id}`}
          name="name"
          defaultValue={item.name}
          required
          className={FIELD}
        />
      </div>

      {apriSubito && (
        <p className="rounded-lg border border-accent bg-accent/10 p-3 text-sm">
          Questa è una copia indipendente: nome, descrizione, ingredienti,
          prezzo, foto, allergeni, varianti e categoria si cambiano tutti da
          qui. Modificarla non tocca il piatto di partenza.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL} htmlFor={`price-${item.id}`}>
            Prezzo (€)
          </label>
          <input
            id={`price-${item.id}`}
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={(item.price_cents / 100).toFixed(2)}
            required
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`vat-${item.id}`}>
            IVA (%)
          </label>
          <input
            id={`vat-${item.id}`}
            name="vatRate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={Number(item.vat_rate)}
            className={FIELD}
          />
        </div>
      </div>

      {mostraFormula && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="fuoriFormula"
            defaultChecked={item.fuori_formula ?? false}
            className="h-4 w-4"
          />
          <span>
            Fuori formula
            <span className="ml-1 text-xs text-muted">
              — si paga a parte anche al tavolo a prezzo fisso (dolci, caffè,
              amari, bevande, piatti premium)
            </span>
          </span>
        </label>
      )}

      <div>
        <label className={LABEL} htmlFor={`kind-${item.id}`}>
          Tipo di voce
        </label>
        <select
          id={`kind-${item.id}`}
          name="kind"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoVoce)}
          className={FIELD}
        >
          {(Object.keys(TIPO_ETICHETTA) as TipoVoce[]).map((k) => (
            <option key={k} value={k}>
              {TIPO_ETICHETTA[k]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          Calice, bottiglia e magnum non si impostano qui: sono varianti, così
          ognuna ha il suo prezzo e può esaurirsi da sola.
        </p>
      </div>

      {tipo !== "food" && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          {tipo === "wine" && (
            <EtichettaForm
              attiva={letturaEtichettaAttiva}
              onCompila={(scheda) => {
                // Si scrive nei campi, non nel database: l'ultima parola
                // resta a chi guarda la bottiglia.
                const form = formRef.current;
                if (!form) return;
                const scrivi = (nome: string, valore: unknown) => {
                  if (valore === undefined || valore === null) return;
                  const campo = form.elements.namedItem(nome);
                  if (campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement) {
                    campo.value = String(valore);
                  }
                };
                scrivi("name", scheda.name);
                scrivi("producer", scheda.producer);
                scrivi("vintage", scheda.vintage);
                scrivi("denomination", scheda.denomination);
                scrivi("origin", scheda.origin);
                scrivi("abv", scheda.abv);
                scrivi("ingredients", scheda.ingredients);
                scrivi("description", scheda.description);
                // Gli allergeni ora sono caselle: l'input nascosto non va
                // scritto a mano, altrimenti la spunta e il valore divergono.
                if (scheda.allergens?.length) {
                  form.dispatchEvent(
                    new CustomEvent("allergeni-suggeriti", {
                      detail: scheda.allergens,
                      bubbles: true,
                    })
                  );
                }
              }}
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL} htmlFor={`prod-${item.id}`}>
                {tipo === "beer" ? "Birrificio" : "Produttore"}
              </label>
              <input
                id={`prod-${item.id}`}
                name="producer"
                defaultValue={item.producer ?? ""}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`orig-${item.id}`}>
                Zona o paese
              </label>
              <input
                id={`orig-${item.id}`}
                name="origin"
                defaultValue={item.origin ?? ""}
                className={FIELD}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={LABEL} htmlFor={`den-${item.id}`}>
                Denominazione
              </label>
              <input
                id={`den-${item.id}`}
                name="denomination"
                placeholder="DOCG"
                defaultValue={item.denomination ?? ""}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`vint-${item.id}`}>
                Annata
              </label>
              <input
                id={`vint-${item.id}`}
                name="vintage"
                type="number"
                min="1900"
                max="2100"
                defaultValue={item.vintage ?? ""}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`abv-${item.id}`}>
                Gradazione
              </label>
              <input
                id={`abv-${item.id}`}
                name="abv"
                type="number"
                step="0.1"
                min="0"
                max="80"
                defaultValue={item.abv ?? ""}
                className={FIELD}
              />
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor={`subcat-${item.id}`}>
              Sottocategoria
            </label>
            <input
              id={`subcat-${item.id}`}
              name="subcategory"
              placeholder={tipo === "wine" ? "Bianco, rosso, bollicine" : tipo === "beer" ? "Bionda, rossa, scura, artigianale" : "Naturale, frizzante, cola"}
              defaultValue={item.subcategory ?? ""}
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL} htmlFor={`format-${item.id}`}>
                Formato
              </label>
              <input
                id={`format-${item.id}`}
                name="format"
                placeholder="0,33 L · 0,75 L · calice"
                defaultValue={item.format ?? ""}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`service-${item.id}`}>
                Servizio
              </label>
              <input
                id={`service-${item.id}`}
                name="serviceType"
                placeholder="Bottiglia · spina · calice"
                defaultValue={item.service_type ?? ""}
                className={FIELD}
              />
            </div>
          </div>

          {tipo === "beer" && (
            <div>
              <label className={LABEL} htmlFor={`style-${item.id}`}>
                Stile birra
              </label>
              <input
                id={`style-${item.id}`}
                name="productStyle"
                placeholder="Lager · IPA · Porter · Weiss"
                defaultValue={item.product_style ?? ""}
                className={FIELD}
              />
            </div>
          )}

          {tipo === "wine" && (
            <div>
              <label className={LABEL} htmlFor={`grape-${item.id}`}>
                Vitigno o uvaggio
              </label>
              <input
                id={`grape-${item.id}`}
                name="grapeVariety"
                placeholder="Vermentino · Sangiovese · blend"
                defaultValue={item.grape_variety ?? ""}
                className={FIELD}
              />
            </div>
          )}

          <div>
            <label className={LABEL} htmlFor={`serv-${item.id}`}>
              Nota di servizio
            </label>
            <input
              id={`serv-${item.id}`}
              name="servingNote"
              placeholder="Servire a 10-12 °C · Decantare 30 minuti"
              defaultValue={item.serving_note ?? ""}
              className={FIELD}
            />
          </div>

          {tipo === "wine" && (
            <p className="text-xs text-muted">
              Quasi ogni vino supera i 10 mg/l di solfiti e va dichiarato:
              scrivi <strong>solfiti</strong> fra gli allergeni qui sotto.
            </p>
          )}
        </div>
      )}

      <div>
        <label className={LABEL} htmlFor={`cat-${item.id}`}>
          Categoria
        </label>
        <select
          id={`cat-${item.id}`}
          name="categoryId"
          defaultValue={item.category_id ?? ""}
          className={FIELD}
        >
          <option value="">Nessuna categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL} htmlFor={`desc-${item.id}`}>
          Descrizione
        </label>
        <textarea
          id={`desc-${item.id}`}
          name="description"
          defaultValue={item.description ?? ""}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`ingr-${item.id}`}>
          Ingredienti
        </label>
        <textarea
          id={`ingr-${item.id}`}
          name="ingredients"
          defaultValue={item.ingredients ?? ""}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <AllergeniFlag valori={item.allergens} />

      <div>
        <label className={LABEL} htmlFor={`diet-${item.id}`}>
          Diciture — vegetariano, vegano, senza_glutine, senza_lattosio, piccante
        </label>
        <input
          id={`diet-${item.id}`}
          name="dietaryTags"
          defaultValue={(item.dietary_tags ?? []).join(", ")}
          placeholder="vegetariano, piccante"
          className={FIELD}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`pair-${item.id}`}>
          Si abbina bene con
        </label>
        <select
          id={`pair-${item.id}`}
          name="pairingItemId"
          defaultValue={item.pairing_item_id ?? ""}
          className={FIELD}
        >
          <option value="">Nessun abbinamento</option>
          {otherItems.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor={`cons-${item.id}`}>
            Conservazione
          </label>
          <select
            id={`cons-${item.id}`}
            name="conservation"
            defaultValue={item.conservation}
            className={FIELD}
          >
            {(Object.keys(CONSERVAZIONE_ETICHETTA) as Conservazione[]).map((c) => (
              <option key={c} value={c}>
                {CONSERVAZIONE_ETICHETTA[c]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Diverso da fresco: al cliente compare l&apos;asterisco con la nota
            di legge. Ometterlo è frode in commercio.
          </p>
        </div>
        <div>
          <label className={LABEL} htmlFor={`orig2-${item.id}`}>
            Origine (obbligatoria per la carne bovina)
          </label>
          <input
            id={`orig2-${item.id}`}
            name="originNote"
            placeholder="Nato, allevato e macellato in Italia"
            defaultValue={item.origin_note ?? ""}
            className={FIELD}
          />
        </div>
      </div>

      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="available"
          defaultChecked={item.available}
          className="h-5 w-5"
        />
        Disponibile — se tolto, il piatto sparisce dal menu del cliente
      </label>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-muted">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 flex-1 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Salvataggio…" : "Salva modifiche"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 rounded-full border border-border px-5 text-sm"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
