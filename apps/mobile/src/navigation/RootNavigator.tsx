import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { AuthStack } from "./AuthStack";
import { AppStack } from "./AppStack";
import { ConsentPendingScreen } from "../screens/ConsentPendingScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { BiometricGate } from "../components/BiometricGate";
import { colors } from "../theme";

/**
 * Mirrors apps/web/src/components/ProtectedRoute.tsx's nested guards
 * (ProtectedRoute → RequireConsent → RequireOnboarding), but as a single
 * switch instead of nested route wrappers — React Navigation swaps the
 * whole tree on auth-state change rather than redirecting within one.
 */
export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.neutral50 }}>
        <ActivityIndicator color={colors.brand600} />
      </View>
    );
  }

  if (!user) return <AuthStack />;

  // A minor can hold a valid session while having no right to have their
  // data processed yet — checked before onboarding, same order as web.
  if (user.consentStatus !== "not_required" && user.consentStatus !== "granted") {
    return <ConsentPendingScreen />;
  }

  if (!user.onboardingComplete) return <OnboardingScreen />;

  return (
    <BiometricGate>
      <AppStack />
    </BiometricGate>
  );
}
