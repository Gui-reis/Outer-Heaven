import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import CreateDealPage from "./pages/CreateDealPage";

/**
 * Fluxo [2]: roteador principal da aplicação.
 * - Define qual página renderizar para cada URL.
 * - " / " abre a landing, "/create" abre o wizard, e qualquer rota inválida volta para "/".
 * - Quem chama: o React Router, logo após o main.tsx montar <App />.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/create" element={<CreateDealPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
