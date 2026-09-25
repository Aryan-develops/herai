export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** LogEntry is pushed on top of the tabs (matches web's /log being its own
 * route rather than a tab), so it lives on the wrapping stack, not in Tabs. */
export type AppStackParamList = {
  Tabs: undefined;
  LogEntry: undefined;
  Care: { type?: "doctor" } | undefined;
  CareProvider: { id: string };
  MyRequests: undefined;
  Provider: undefined;
  Settings: undefined;
  TimelinePage: undefined;
  Onboarding: undefined;
  PartnerSettings: undefined;
  PartnerUpgrade: undefined;
  Join: { token: string };
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Timeline: undefined;
  Partner: undefined;
  Cycle: undefined;
  Chat: undefined;
  Reports: undefined;
};

/** Reports gets its own nested stack (list → detail with an id param),
 * mirrored under the "Reports" tab — same nesting pattern as AppStack
 * wrapping MainTabs for LogEntry. */
export type ReportsStackParamList = {
  ReportsList: undefined;
  ReportDetail: { id: string };
};
