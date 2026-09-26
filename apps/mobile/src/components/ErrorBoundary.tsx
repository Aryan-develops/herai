import { Component, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { reportError } from "../lib/errorReporting";
import { Button } from "./ui";
import { colors } from "../theme";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** A render error anywhere in the tree must not white-screen the app for a
 * health app's users mid-task — this is the one thing standing between a
 * crash and a screen that at least explains what happened and offers a way
 * out. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    reportError(error, { source: "ErrorBoundary" });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            Lunee hit an unexpected error. Your data is safe — try restarting the app.
          </Text>
          <Button title="Try again" onPress={() => this.setState({ error: null })} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.neutral50, gap: 12 },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink900 },
  body: { fontSize: 14, color: colors.ink700, textAlign: "center" },
});
