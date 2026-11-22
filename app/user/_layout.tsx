import { Stack } from "expo-router";
import { HeaderBack } from "@/components/header-back";
import { DETAIL_STACK_OPTIONS } from "@/components/header-controls";
import { useI18n } from "@/lib/i18n/provider";
import { useStackScreenOptions } from "@/lib/navigation/stack-options";

export default function UserLayout() {
	const screenOptions = useStackScreenOptions(DETAIL_STACK_OPTIONS);
	const { t } = useI18n();
	return (
		<Stack screenOptions={screenOptions}>
			<Stack.Screen
				name="[profileUrl]/index"
				options={{
					title: "",
					// Root of this nested stack, so no automatic back button — add one
					// that pops back to wherever the profile was opened from.
					headerLeft: () => <HeaderBack />,
				}}
			/>
			<Stack.Screen
				name="[profileUrl]/followers"
				options={{ title: t("titles.followers") }}
			/>
			<Stack.Screen
				name="[profileUrl]/following"
				options={{ title: t("titles.following") }}
			/>
		</Stack>
	);
}
