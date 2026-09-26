import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { DashboardScreen } from "../screens/DashboardScreen";
import { CycleScreen } from "../screens/CycleScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { PartnerHomeScreen } from "../screens/PartnerHomeScreen";
import { colors } from "../theme";
import type { MainTabsParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabsParamList>();

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Five calm destinations. Log is the raised centre button and opens the Log screen on top of the tabs.
// Reports, Care and History live under Settings > More.
const ICONS: Record<keyof MainTabsParamList, [IconName, IconName]> = {
  Dashboard: ["sunny-outline", "sunny"],
  Cycle: ["calendar-outline", "calendar"],
  LogTab: ["add", "add"],
  Partner: ["heart-circle-outline", "heart-circle"],
  Chat: ["sparkles-outline", "sparkles"],
};

function Empty() {
  return null;
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand600,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.neutral200, height: 64, paddingTop: 6 },
        tabBarIcon: ({ focused, color }) => {
          const [off, on] = ICONS[route.name as keyof MainTabsParamList];
          return <Ionicons name={focused ? on : off} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Today" }} />
      <Tab.Screen name="Cycle" component={CycleScreen} options={{ title: "Calendar" }} />
      <Tab.Screen
        name="LogTab"
        component={Empty}
        options={({ navigation }) => ({
          title: "",
          tabBarAccessibilityLabel: "Log",
          tabBarButton: () => (
            <View style={s.centerWrap}>
              <Pressable
                onPress={() => navigation.getParent()?.navigate("LogEntry")}
                accessibilityRole="button"
                accessibilityLabel="Log"
                style={({ pressed }) => [s.center, pressed && { transform: [{ scale: 0.95 }] }]}
              >
                <LinearGradient colors={[colors.brand500, colors.brand600]} style={s.centerFill}>
                  <Ionicons name="add" size={30} color={colors.onBrand} />
                </LinearGradient>
              </Pressable>
            </View>
          ),
        })}
      />
      <Tab.Screen name="Partner" component={PartnerHomeScreen} options={{ title: "Partner" }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: "Ask" }} />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: "center" },
  center: { marginTop: -22, width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: colors.neutral50, overflow: "hidden", elevation: 6 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
});
