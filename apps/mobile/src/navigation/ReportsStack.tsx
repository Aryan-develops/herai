import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ReportsListScreen } from "../screens/ReportsListScreen";
import { ReportDetailScreen } from "../screens/ReportDetailScreen";
import type { ReportsStackParamList } from "./types";

const Stack = createNativeStackNavigator<ReportsStackParamList>();

export function ReportsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ReportsList" component={ReportsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ title: "Report" }} />
    </Stack.Navigator>
  );
}
