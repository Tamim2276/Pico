import RootNavigator from "@presentation/navigation/RootNavigator";
import { ThemeProvider } from "@presentation/context/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
