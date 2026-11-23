import { Route, Routes } from "react-router-dom";
import { ResumePage } from "./components/pages/ResumePage";
import { VideoPage } from "./components/pages/VideoPage";
import { useTheme } from "./hooks/use-theme";

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Routes>
      <Route
        path="/"
        element={<ResumePage theme={theme} onToggleTheme={toggleTheme} />}
      />
      <Route path="*" element={<VideoPage />} />
    </Routes>
  );
}

export default App;
