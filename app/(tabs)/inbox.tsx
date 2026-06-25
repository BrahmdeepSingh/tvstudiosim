import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function InboxScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.text}>Inbox — coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f17' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text:      { color: '#6b6b82', fontSize: 16 },
});
