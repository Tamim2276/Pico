import RootNavigator from "@presentation/navigation/RootNavigator";
import { ThemeProvider } from "@presentation/context/ThemeContext";
import { AuthProvider } from "@presentation/context/AuthContext";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
