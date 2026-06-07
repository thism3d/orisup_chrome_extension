import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Snackbar, Alert } from "@mui/material";

type Notify = (kind: "success" | "error", message: string) => void;

const CartFeedbackContext = createContext<Notify | null>(null);

export function CartFeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [severity, setSeverity] = useState<"success" | "error">("success");

  const notify = useCallback((kind: "success" | "error", message: string) => {
    setSeverity(kind);
    setMsg(message);
    setOpen(true);
  }, []);

  return (
    <CartFeedbackContext.Provider value={notify}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={3800}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={severity}
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{ width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.18)" }}
        >
          {msg}
        </Alert>
      </Snackbar>
    </CartFeedbackContext.Provider>
  );
}

export function useCartFeedback() {
  return useContext(CartFeedbackContext);
}
