import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { DashboardScreen } from "../screens/DashboardScreen";
import { TimelineScreen } from "../screens/TimelineScreen";
import { CycleScreen } from "../screens/CycleScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ReportsStack } from "./ReportsStack";
import { colors } from "../theme";
import type { MainTabsParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabsParamList>();

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// [inactive, active] — outline at rest, filled when selected, one icon family throughout.
const ICONS: Record<keyof MainTabsParamList, [IconName, IconName]> = {
  Dashboard: ["home-outline", "home"],
  Timeline: ["time-outline", "time"],
  Cycle: ["water-outline", "water"],
  Chat: ["chatbubble-ellipses-outline", "chatbubble-ellipses"],
  Reports: ["document-text-outline", "document-text"],
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand600,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.neutral200, height: 60, paddingTop: 6 },
        tabBarIcon: ({ focused, color }) => {
          const [off, on] = ICONS[route.name as keyof MainTabsParamList];
          return <Ionicons name={focused ? on : off} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Home" }} />
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Cycle" component={CycleScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: "Ask HERAI" }} />
      <Tab.Screen name="Reports" component={ReportsStack} />
    </Tab.Navigator>
  );
}
