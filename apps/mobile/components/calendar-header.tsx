import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { FontFamily } from '@/constants/theme';
import { SafeAreaView } from "react-native-safe-area-context";
import { Icons } from "./icons";

type CalendarHeaderProps = {
  year?: number;
};

export default function CalendarHeader({ year }: CalendarHeaderProps) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      {typeof year === 'number' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Visible year"
          style={styles.floatingYearButton}
          onPress={() => router.push('/year')}
        >
          <Icons.chevronLeft />
          <Text style={styles.floatingYearText}>{year}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  floatingYearButton: {
    height: 50,
    width: 100,
    position: 'absolute',
    top: 24,
    left: 16,
    backgroundColor: 'white',
    textAlign: 'center',
    color: 'black',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    opacity: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    // Elevation (Android)
    elevation: 6,
  },
  floatingYearText: {
    color: 'black',
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
});