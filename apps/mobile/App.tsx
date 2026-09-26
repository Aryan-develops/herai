import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { PrefsProvider } from "./src/context/PrefsContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { initErrorReporting } from "./src/lib/errorReporting";
import { initJoinLinks } from "./src/lib/pendingJoin";
import { colors, isDark } from "./src/theme";

initErrorReporting();
initJoinLinks();

const base = isDark ? DarkTheme : DefaultTheme;
const navTheme: Theme = {
  ...base,
  colors: {
    ...base.colors,
    primary: colors.brand600,
    background: colors.neutral50,
    card: colors.neutral50,
    text: colors.ink900,
    border: colors.neutral200,
    notification: colors.brand600,
  },
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <PrefsProvider>
          <NavigationContainer theme={navTheme}>
            <RootNavigator />
            <StatusBar style={isDark ? "light" : "dark"} />
          </NavigationContainer>
          </PrefsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
