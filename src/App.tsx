import { Toaster } from "sonner";
import { DecisionProvider } from "./components/DecisionDialog";
import { DashboardPage } from "./features/dashboard/Dashboard";
import { PublicForm } from "./features/runner/PublicForm";
export function App() {
 const pathname = location.pathname.replace(/^\/|\/$/g, "");
 return <DecisionProvider>
  {pathname ? <PublicForm slug={encodeURIComponent(pathname)} /> : <DashboardPage />}
  <Toaster position="bottom-right" richColors />
 </DecisionProvider>;
}
