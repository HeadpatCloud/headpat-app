import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export default function Home() {
  return (
    <View className="bg-background flex-1 items-center justify-center gap-2 px-6">
      <Text variant="large">Headpat</Text>
      <Text variant="muted" className="text-center">
        You're signed in. The home feed lands in a later build.
      </Text>
    </View>
  );
}
