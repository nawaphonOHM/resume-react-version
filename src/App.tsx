import { lazy, Suspense, useLayoutEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { RouteLoading } from "./components/layout/RouteLoading";
import { useTheme } from "./hooks/use-theme";

const ResumePage = lazy(async () => {
  const module = await import("./components/pages/ResumePage");
  return { default: module.ResumePage };
});

const VideoPage = lazy(async () => {
  const module = await import("./components/pages/VideoPage");
  return { default: module.VideoPage };
});

interface RouteSignalProps {
  loading: boolean;
  onChange: (loading: boolean) => void;
}

function RouteSignal({ loading, onChange }: RouteSignalProps) {
  useLayoutEffect(() => {
    onChange(loading);
  }, [loading, onChange]);

  return null;
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const [routeLoading, setRouteLoading] = useState(true);

  return (
    <>
      <RouteLoading loading={routeLoading} />
      <Suspense fallback={<RouteSignal loading onChange={setRouteLoading} />}>
        <Routes>
          <Route
            path="/"
            element={<ResumePage theme={theme} onToggleTheme={toggleTheme} />}
          />
          <Route path="*" element={<VideoPage />} />
        </Routes>
        <RouteSignal loading={false} onChange={setRouteLoading} />
      </Suspense>
    </>
  );
}

export default App;
