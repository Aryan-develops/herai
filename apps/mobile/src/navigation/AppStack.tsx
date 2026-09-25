import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainTabs } from "./MainTabs";
import { LogEntryScreen } from "../screens/LogEntryScreen";
import { CareScreen } from "../screens/CareScreen";
import { CareProviderScreen } from "../screens/CareProviderScreen";
import { MyRequestsScreen } from "../screens/MyRequestsScreen";
import { ProviderScreen } from "../screens/ProviderScreen";
import type { AppStackParamList } from "./types";

const Stack = createNativeStackNavigator<AppStackParamList>();

/** LogEntry is pushed modally on top of the tabs, mirroring web's /log
 * being its own route reached via a link from the dashboard. */
export function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="LogEntry" component={LogEntryScreen} options={{ title: "Log entry", presentation: "modal" }} />
      <Stack.Screen name="Care" component={CareScreen} options={{ title: "Find care" }} />
      <Stack.Screen name="CareProvider" component={CareProviderScreen} options={{ title: "" }} />
      <Stack.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: "My requests" }} />
      <Stack.Screen name="Provider" component={ProviderScreen} options={{ title: "Provider" }} />
    </Stack.Navigator>
  );
}
