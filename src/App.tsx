import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Shell } from "./components/shell";
import { useApp } from "./lib/store";
import { isCloudBackend } from "./lib/backend";

import Welcome from "./pages/Welcome";
import Discover from "./pages/Discover";
import Feed from "./pages/Feed";
import Bands from "./pages/Bands";
import BandDetail from "./pages/BandDetail";
import MusicianProfile from "./pages/MusicianProfile";
import MyProfile from "./pages/MyProfile";
import Messages from "./pages/Messages";
import Thread from "./pages/Thread";
import Notifications from "./pages/Notifications";
import SosResponse from "./pages/SosResponse";
import VenueDetail from "./pages/VenueDetail";
import EventDetail from "./pages/EventDetail";

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink text-sm text-text-lo">
      <span className="mono flex items-center gap-2.5">
        <span className="blink h-2 w-2 rounded-full bg-amber-500" />
        Loading Backline…
      </span>
    </div>
  );
}

export default function App() {
  const { state, auth } = useApp();
  const location = useLocation();

  // resolving the session / initial data
  if (auth.status === "loading") {
    return <Splash />;
  }

  // cloud mode: no session yet → route everything to the sign-in screen
  if (isCloudBackend && auth.status === "signedOut" && location.pathname !== "/welcome") {
    return <Navigate to="/welcome" replace />;
  }

  // onboarding gate: signed in (or demo mode) but no profile yet
  if (
    auth.status === "signedIn" &&
    !state.user &&
    location.pathname !== "/welcome"
  ) {
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
        <Route path="/e/:id" element={<EventDetail />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Thread />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/sos/:id" element={<SosResponse />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
