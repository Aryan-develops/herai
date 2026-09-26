import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainTabs } from "./MainTabs";
import { ReportsListScreen } from "../screens/ReportsListScreen";
import { ReportDetailScreen } from "../screens/ReportDetailScreen";
import { LogEntryScreen } from "../screens/LogEntryScreen";
import { CareScreen } from "../screens/CareScreen";
import { CareProviderScreen } from "../screens/CareProviderScreen";
import { MyRequestsScreen } from "../screens/MyRequestsScreen";
import { ProviderScreen } from "../screens/ProviderScreen";
import { TimelineScreen } from "../screens/TimelineScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { PartnerSettingsScreen } from "../screens/PartnerSettingsScreen";
import { PartnerUpgradeScreen } from "../screens/PartnerUpgradeScreen";
import { JoinScreen } from "../screens/JoinScreen";
import { onPendingJoin, takePendingJoin } from "../lib/pendingJoin";
import { colors } from "../theme";
import type { AppStackParamList } from "./types";

const Stack = createNativeStackNavigator<AppStackParamList>();

/** LogEntry is pushed modally on top of the tabs, mirroring web's /log
 * being its own route reached via a link from the dashboard. */
/** Opens the Join screen when an invite link was tapped, including one that arrived before sign-in. */
function PendingJoinWatcher() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  useEffect(() => {
    const open = () => {
      const token = takePendingJoin();
      if (token) navigation.navigate("Join", { token });
    };
    open();
    return onPendingJoin(open);
  }, [navigation]);
  return null;
}

export function AppStack() {
  return (
    <>
    <PendingJoinWatcher />
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.neutral50 },
        headerTintColor: colors.ink900,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.neutral50 },
      }}
    >
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="LogEntry" component={LogEntryScreen} options={{ title: "Log", presentation: "modal" }} />
      <Stack.Screen name="Reports" component={ReportsListScreen as never} options={{ title: "Lab reports" }} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen as never} options={{ title: "Report" }} />
      <Stack.Screen name="Care" component={CareScreen} options={{ title: "Find care" }} />
      <Stack.Screen name="CareProvider" component={CareProviderScreen} options={{ title: "" }} />
      <Stack.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: "My requests" }} />
      <Stack.Screen name="Provider" component={ProviderScreen} options={{ title: "Provider" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      <Stack.Screen name="TimelinePage" component={TimelineScreen} options={{ title: "History" }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: "Health profile" }} />
      <Stack.Screen name="PartnerSettings" component={PartnerSettingsScreen} options={{ title: "Partner sharing" }} />
      <Stack.Screen name="PartnerUpgrade" component={PartnerUpgradeScreen} options={{ title: "Plan and gifts" }} />
      <Stack.Screen name="Join" component={JoinScreen} options={{ title: "Invite", presentation: "modal" }} />
    </Stack.Navigator>
    </>
  );
}
