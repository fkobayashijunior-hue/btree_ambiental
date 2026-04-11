import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import UsersPage from "./pages/UsersPage";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Collaborators from "./pages/Collaborators";
import AttendanceList from "./pages/AttendanceList";
import Landing from "./pages/Landing";
import SectorsEquipment from "./pages/SectorsEquipment";
import AccessControl from "./pages/AccessControl";
import CargoControl from "./pages/CargoControl";
import MachineHoursPage from "./pages/MachineHoursPage";
import VehicleControlPage from "./pages/VehicleControlPage";
import PartsPage from "./pages/PartsPage";
import ClientsPage from "./pages/ClientsPage";
import ClientPortal from "./pages/ClientPortal";
import CollaboratorDetail from "./pages/CollaboratorDetail";
import EquipmentDetail from "./pages/EquipmentDetail";
import GpsTrackingPage from "./pages/GpsTrackingPage";
import ChainsawModule from "./pages/ChainsawModule";
import ExtraExpenses from "./pages/ExtraExpenses";
import FinancialModule from "./pages/FinancialModule";
import GpsLocationsPage from "./pages/GpsLocationsPage";
import ReplantingPage from "./pages/ReplantingPage";
import ClientPaymentsPage from "./pages/ClientPaymentsPage";
import DriverCargoView from "./pages/DriverCargoView";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";

// Wrapper que aplica DashboardLayout a páginas protegidas
function WithLayout({ component: Component }: { component: React.ComponentType }) {
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Rotas públicas — sem DashboardLayout */}
      <Route path={"/"} component={Landing} />
      <Route path={"/login"} component={Login} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/reset-password"} component={ResetPassword} />
      <Route path={"/client-portal"} component={ClientPortal} />

      {/* Rotas protegidas — com DashboardLayout centralizado */}
      <Route path={"/app"}>
        {() => <WithLayout component={Home} />}
      </Route>
      <Route path={"/colaboradores"}>
        {() => <WithLayout component={Collaborators} />}
      </Route>
      <Route path={"/colaboradores/:id"}>
        {() => <WithLayout component={CollaboratorDetail} />}
      </Route>
      <Route path={"/equipamento/:id"}>
        {() => <WithLayout component={EquipmentDetail} />}
      </Route>
      <Route path={"/presencas"}>
        {() => <WithLayout component={AttendanceList} />}
      </Route>
      <Route path={"/setores"}>
        {() => <WithLayout component={SectorsEquipment} />}
      </Route>
      <Route path={"/controle-acesso"}>
        {() => <WithLayout component={AccessControl} />}
      </Route>
      <Route path={"/cargas"}>
        {() => <WithLayout component={CargoControl} />}
      </Route>
      <Route path={"/maquinas"}>
        {() => <WithLayout component={MachineHoursPage} />}
      </Route>
      <Route path={"/veiculos"}>
        {() => <WithLayout component={VehicleControlPage} />}
      </Route>
      <Route path={"/pecas"}>
        {() => <WithLayout component={PartsPage} />}
      </Route>
      <Route path={"/clientes"}>
        {() => <WithLayout component={ClientsPage} />}
      </Route>
      <Route path={"/usuarios"}>
        {() => <WithLayout component={UsersPage} />}
      </Route>
      <Route path={"/rastreamento-gps"}>
        {() => <WithLayout component={GpsTrackingPage} />}
      </Route>
      <Route path={"/motosserras"}>
        {() => <WithLayout component={ChainsawModule} />}
      </Route>
      <Route path={"/gastos-extras"}>
        {() => <WithLayout component={ExtraExpenses} />}
      </Route>
      <Route path={"/financeiro"}>
        {() => <WithLayout component={FinancialModule} />}
      </Route>
      <Route path={"/locais-gps"}>
        {() => <WithLayout component={GpsLocationsPage} />}
      </Route>
      <Route path={"/replantios"}>
        {() => <WithLayout component={ReplantingPage} />}
      </Route>
      <Route path={"/pagamentos-clientes"}>
        {() => <WithLayout component={ClientPaymentsPage} />}
      </Route>
      <Route path={"/motorista"}>
        {() => <WithLayout component={DriverCargoView} />}
      </Route>
      <Route path={"/dashboard-executivo"}>
        {() => <WithLayout component={ExecutiveDashboard} />}
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <OfflineIndicator />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
