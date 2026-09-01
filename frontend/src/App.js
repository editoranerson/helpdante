import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Portal from "@/pages/Portal";
import Suicidio from "@/pages/Suicidio";
import Admin from "@/pages/Admin";
import DanteChat from "@/components/DanteChat";
import { MiniPlayerProvider } from "@/lib/miniPlayer";

function App() {
  return (
    <div className="App">
      <MiniPlayerProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Portal />} />
            <Route path="/suicidio" element={<Suicidio />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
          <DanteChat />
        </BrowserRouter>
      </MiniPlayerProvider>
      <Toaster richColors position="top-center" />
    </div>
  );
}

export default App;
