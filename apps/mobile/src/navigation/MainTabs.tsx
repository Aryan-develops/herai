import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { DashboardScreen } from "../screens/DashboardScreen";
import { TimelineScreen } from "../screens/TimelineScreen";
import { CycleScreen } from "../screens/CycleScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ReportsStack } from "./ReportsStack";
import { colors } from "../theme";
import type { MainTabsParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabsParamList>();

const ICONS: Record<keyof MainTabsParamList, string> = {
  Dashboard: "🏠",
  Timeline: "📈",
  Cycle: "🩸",
  Chat: "💬",
  Reports: "📄",
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand600,
        tabBarInactiveTintColor: colors.ink700,
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name as keyof MainTabsParamList]}</Text>,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Cycle" component={CycleScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: "Ask HERAI" }} />
      <Tab.Screen name="Reports" component={ReportsStack} />
    </Tab.Navigator>
  );
}
