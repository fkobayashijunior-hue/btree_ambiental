import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import UsersPage from "./pages/UsersPage";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Collaborators from "./pages/Collaborators";
import BiometricAttendancePage from "./pages/BiometricAttendance";
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

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/reset-password"} component={ResetPassword} />
      <Route path={"/colaboradores"} component={Collaborators} />
      <Route path={"/presenca"} component={BiometricAttendancePage} />
      <Route path={"/presencas"} component={AttendanceList} />
      <Route path={"/setores"} component={SectorsEquipment} />
      <Route path={"/controle-acesso"} component={AccessControl} />
      <Route path={"/cargas"} component={CargoControl} />
      <Route path={"/maquinas"} component={MachineHoursPage} />
      <Route path={"/veiculos"} component={VehicleControlPage} />
      <Route path={"/pecas"} component={PartsPage} />
      <Route path={"/clientes"} component={ClientsPage} />
      <Route path={"/client-portal"} component={ClientPortal} />
      <Route path={"/"} component={Landing} />
      <Route path={"/app"} component={Home} />
      <Route path={"/usuarios"} component={UsersPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
