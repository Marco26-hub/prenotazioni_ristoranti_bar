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
import { useLingua } from "@repo/shared/i18n/contesto";
import { tComune } from "@repo/shared/i18n/comune";
import { tMenuAdmin, nomeConservazione } from "@/i18n/menu";

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
  const lingua = useLingua();
  const t = tMenuAdmin(lingua);
  const tc = tComune(lingua);
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
        {tc("azione.modifica")}
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
            setMessage(t("modifica.salvato"));
            setOpen(false);
          }
        });
      }}
      className="mt-3 space-y-3 rounded-lg border border-border p-3"
    >
      <input type="hidden" name="itemId" value={item.id} />

      <div>
        <label className={LABEL} htmlFor={`name-${item.id}`}>
          {t("modifica.nome")}
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
          {t("modifica.copia.avviso")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL} htmlFor={`price-${item.id}`}>
            {t("modifica.prezzo")}
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
            {t("modifica.iva")}
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
            {t("modifica.fuori.formula")}
            <span className="ml-1 text-xs text-muted">
              {t("modifica.fuori.formula.nota")}
            </span>
          </span>
        </label>
      )}

      <div>
        <label className={LABEL} htmlFor={`kind-${item.id}`}>
          {t("modifica.tipo")}
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
              {t(`tipo.${k}`)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          {t("modifica.tipo.nota")}
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
                {tipo === "beer" ? t("modifica.birrificio") : t("modifica.produttore")}
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
                {t("modifica.zona")}
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
                {t("modifica.denominazione")}
              </label>
              <input
                id={`den-${item.id}`}
                name="denomination"
                placeholder={t("modifica.denominazione.segnaposto")}
                defaultValue={item.denomination ?? ""}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`vint-${item.id}`}>
                {t("modifica.annata")}
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
                {t("modifica.gradazione")}
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
              {t("modifica.sottocategoria")}
            </label>
            <input
              id={`subcat-${item.id}`}
              name="subcategory"
              placeholder={
                tipo === "wine"
                  ? t("modifica.sottocategoria.vino")
                  : tipo === "beer"
                    ? t("modifica.sottocategoria.birra")
                    : t("modifica.sottocategoria.bevanda")
              }
              defaultValue={item.subcategory ?? ""}
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL} htmlFor={`format-${item.id}`}>
                {t("modifica.formato")}
              </label>
              <input
                id={`format-${item.id}`}
                name="format"
                placeholder={t("modifica.formato.segnaposto")}
                defaultValue={item.format ?? ""}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`service-${item.id}`}>
                {t("modifica.servizio")}
              </label>
              <input
                id={`service-${item.id}`}
                name="serviceType"
                placeholder={t("modifica.servizio.segnaposto")}
                defaultValue={item.service_type ?? ""}
                className={FIELD}
              />
            </div>
          </div>

          {tipo === "beer" && (
            <div>
              <label className={LABEL} htmlFor={`style-${item.id}`}>
                {t("modifica.stile.birra")}
              </label>
              <input
                id={`style-${item.id}`}
                name="productStyle"
                placeholder={t("modifica.stile.birra.segnaposto")}
                defaultValue={item.product_style ?? ""}
                className={FIELD}
              />
            </div>
          )}

          {tipo === "wine" && (
            <div>
              <label className={LABEL} htmlFor={`grape-${item.id}`}>
                {t("modifica.vitigno")}
              </label>
              <input
                id={`grape-${item.id}`}
                name="grapeVariety"
                placeholder={t("modifica.vitigno.segnaposto")}
                defaultValue={item.grape_variety ?? ""}
                className={FIELD}
              />
            </div>
          )}

          <div>
            <label className={LABEL} htmlFor={`serv-${item.id}`}>
              {t("modifica.nota.servizio")}
            </label>
            <input
              id={`serv-${item.id}`}
              name="servingNote"
              placeholder={t("modifica.nota.servizio.segnaposto")}
              defaultValue={item.serving_note ?? ""}
              className={FIELD}
            />
          </div>

          {tipo === "wine" && (
            <p className="text-xs text-muted">
              {t("modifica.solfiti.prima")}
              <strong>{t("modifica.solfiti.parola")}</strong>
              {t("modifica.solfiti.dopo")}
            </p>
          )}
        </div>
      )}

      <div>
        <label className={LABEL} htmlFor={`cat-${item.id}`}>
          {t("modifica.categoria")}
        </label>
        <select
          id={`cat-${item.id}`}
          name="categoryId"
          defaultValue={item.category_id ?? ""}
          className={FIELD}
        >
          <option value="">{t("modifica.categoria.nessuna")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL} htmlFor={`desc-${item.id}`}>
          {t("modifica.descrizione")}
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
          {t("modifica.ingredienti")}
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
          {t("modifica.diciture")}
        </label>
        <input
          id={`diet-${item.id}`}
          name="dietaryTags"
          defaultValue={(item.dietary_tags ?? []).join(", ")}
          placeholder={t("modifica.diciture.segnaposto")}
          className={FIELD}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`pair-${item.id}`}>
          {t("modifica.abbinamento")}
        </label>
        <select
          id={`pair-${item.id}`}
          name="pairingItemId"
          defaultValue={item.pairing_item_id ?? ""}
          className={FIELD}
        >
          <option value="">{t("modifica.abbinamento.nessuno")}</option>
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
            {t("modifica.conservazione")}
          </label>
          <select
            id={`cons-${item.id}`}
            name="conservation"
            defaultValue={item.conservation}
            className={FIELD}
          >
            {(Object.keys(CONSERVAZIONE_ETICHETTA) as Conservazione[]).map((c) => (
              <option key={c} value={c}>
                {nomeConservazione(c, lingua)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            {t("modifica.conservazione.nota")}
          </p>
        </div>
        <div>
          <label className={LABEL} htmlFor={`orig2-${item.id}`}>
            {t("modifica.origine")}
          </label>
          <input
            id={`orig2-${item.id}`}
            name="originNote"
            placeholder={t("modifica.origine.segnaposto")}
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
        {t("modifica.disponibile")}
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
          {pending ? t("modifica.salvataggio") : t("modifica.salva")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 rounded-full border border-border px-5 text-sm"
        >
          {tc("azione.annulla")}
        </button>
      </div>
    </form>
  );
}
