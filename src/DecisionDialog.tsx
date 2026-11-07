import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Decision = {
  title: string;
  description: string;
  acceptLabel: string;
  onAccept: () => void;
};

const DecisionContext = createContext<((decision: Decision) => void) | null>(null);

export function useDecision() {
  const ask = useContext(DecisionContext);
  if (!ask) throw new Error("Se requiere DecisionProvider.");
  return ask;
}

function DecisionDialog({ decision, dismiss }: { decision: Decision; dismiss: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog ref={ref} className="decision-dialog" aria-labelledby="decision-title"
      aria-describedby="decision-description" onCancel={dismiss}>
      <h2 id="decision-title">{decision.title}</h2>
      <p id="decision-description">{decision.description}</p>
      <div className="actions">
        <button autoFocus onClick={dismiss}>Cancelar</button>
        <button className="destructive" onClick={() => {
          dismiss();
          decision.onAccept();
        }}>{decision.acceptLabel}</button>
      </div>
    </dialog>
  );
}

export function DecisionProvider({ children }: { children: ReactNode }) {
  const [decision, setDecision] = useState<Decision | null>(null);
  return (
    <DecisionContext.Provider value={setDecision}>
      {children}
      {decision && <DecisionDialog decision={decision} dismiss={() => setDecision(null)} />}
    </DecisionContext.Provider>
  );
}
