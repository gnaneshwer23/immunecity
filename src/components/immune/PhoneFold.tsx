import { useId, useState, type ReactNode } from "react";

/**
 * On phones, shows only the start of long content with a "Show more" button.
 * On wider screens everything is shown and the button is hidden (CSS only).
 */
export default function PhoneFold({
  children,
  label = "Show more",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={`phone-fold${open ? " open" : ""} ${className}`}>
      <div className="phone-fold-body" id={id}>
        {children}
      </div>
      <button type="button" className="btn sm phone-fold-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {open ? "Show less" : label}
      </button>
    </div>
  );
}
