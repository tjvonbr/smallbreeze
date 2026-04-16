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
          onPress={() => router.push({ pathname: '/year', params: { initialYear: String(year) } })}
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
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: 'white',
  },
  floatingYearButton: {
    height: 32,
    width: 84,
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