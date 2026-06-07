import { Alert, type AlertColor, Snackbar } from "@mui/material";
import { createContext, useCallback, useContext, useState } from "react";

type Ctx = {
  showToast: (message: string, severity?: AlertColor) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertColor>("info");

  const showToast = useCallback((m: string, s: AlertColor = "info") => {
    setMessage(m);
    setSeverity(s);
    setOpen(true);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        onClose={(_, r) => {
          if (r === "clickaway") return;
          setOpen(false);
        }}
        autoHideDuration={severity === "error" ? 8000 : 5000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ mt: 2, zIndex: (t) => t.zIndex.modal + 3 }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={severity}
          variant="filled"
          sx={{ width: "100%", alignItems: "center" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastContext);
  if (!c) throw new Error("useToast must be used within ToastProvider");
  return c.showToast;
}
