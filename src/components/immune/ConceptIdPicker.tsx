/**
 * Searchable atlas concept picker — prefer labels over typed graph IDs.
 */
import { useMemo, useState } from "react";
import { NodeChip } from "@/components/immune/ui";
import { byId } from "@/lib/immune/engine";
import { searchConcepts } from "@/lib/siteSearch";

export default function ConceptIdPicker({
  selected,
  onChange,
  placeholder = "Search concepts (e.g. melanoma, PD-1)",
  max = 20,
  label = "Concepts",
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  max?: number;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => searchConcepts(query, 8), [query]);

  function add(id: string) {
    if (selected.includes(id) || selected.length >= max) return;
    onChange([...selected, id]);
    setQuery("");
  }

  function remove(id: string) {
    onChange(selected.filter((x) => x !== id));
  }

  return (
    <div className="isi-concept-picker" data-testid="concept-id-picker">
      <label className="isi-sme-field">
        <span>{label}</span>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
        />
      </label>
      {hits.length ? (
        <ul className="isi-concept-hits" role="listbox">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="isi-concept-hit"
                disabled={selected.includes(h.id)}
                onClick={() => add(h.id)}
              >
                <strong>{h.title}</strong>
                <span className="muted xs">
                  {h.typeLabel}
                  {h.status ? ` · ${h.status}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {selected.length ? (
        <div className="isi-concept-selected">
          {selected.map((id) => (
            <span key={id} className="isi-concept-chip-row">
              {byId[id] ? <NodeChip id={id} /> : <code>{id}</code>}
              <button type="button" className="btn sm" onClick={() => remove(id)} aria-label={`Remove ${id}`}>
                Remove
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="xs muted">No concepts selected yet — search by name.</p>
      )}
    </div>
  );
}
