import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import CreateDealPage from "./pages/CreateDealPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/create" element={<CreateDealPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
