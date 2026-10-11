import { ChevronDown } from "lucide-react";

export function DetailToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button className={`dt-toggle${open ? " open" : ""}`} onClick={onToggle} aria-expanded={open}>
      {open ? "Hide detail" : "Show detail"}
      <ChevronDown size={14} />
    </button>
  );
}
