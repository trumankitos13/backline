import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Shell } from "./components/shell";
import { useApp } from "./lib/store";

import Welcome from "./pages/Welcome";
import Discover from "./pages/Discover";
import Feed from "./pages/Feed";
import Bands from "./pages/Bands";
import BandDetail from "./pages/BandDetail";
import MusicianProfile from "./pages/MusicianProfile";
import MyProfile from "./pages/MyProfile";
import Messages from "./pages/Messages";
import Thread from "./pages/Thread";
import VenueDetail from "./pages/VenueDetail";

export default function App() {
  const { state } = useApp();
  const location = useLocation();

  // first run: everything routes to the welcome/onboarding flow
  if (!state.user && location.pathname !== "/welcome") {
    return <Navigate to="/welcome" replace />;
  }

  if (location.pathname === "/welcome") {
    return (
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
      </Routes>
    );
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Discover />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/bands" element={<Bands />} />
        <Route path="/b/:id" element={<BandDetail />} />
        <Route path="/m/:id" element={<MusicianProfile />} />
        <Route path="/v/:id" element={<VenueDetail />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Thread />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
