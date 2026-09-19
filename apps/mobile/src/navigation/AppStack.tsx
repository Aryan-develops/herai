import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainTabs } from "./MainTabs";
import { LogEntryScreen } from "../screens/LogEntryScreen";
import type { AppStackParamList } from "./types";

const Stack = createNativeStackNavigator<AppStackParamList>();

/** LogEntry is pushed modally on top of the tabs, mirroring web's /log
 * being its own route reached via a link from the dashboard. */
export function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="LogEntry" component={LogEntryScreen} options={{ title: "Log entry", presentation: "modal" }} />
    </Stack.Navigator>
  );
}
