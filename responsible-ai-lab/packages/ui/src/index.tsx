import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

export function Surface({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={clsx("surface", className)} {...props} />;
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="field-label">
      {children}
    </label>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "quiet" | "danger" | "success" }>(
  function Button({ className, tone = "primary", type = "button", ...props }, ref) {
    return <button ref={ref} type={type} className={clsx("button", `button-${tone}`, className)} {...props} />;
  }
);

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "danger" }) {
  return <span className={clsx("status-pill", `status-${tone}`)}>{children}</span>;
}

export function ScreenReaderOnly({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}
