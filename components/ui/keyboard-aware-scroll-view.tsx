import { forwardRef } from "react";
import type { ScrollViewProps } from "react-native";
import {
	KeyboardAwareScrollView as ControllerScrollView,
	type KeyboardAwareScrollViewRef,
} from "react-native-keyboard-controller";

/**
 * ScrollView that stays scrollable while the keyboard is up, and scrolls the
 * focused field into view.
 *
 * RN's KeyboardAvoidingView is not an option: the app runs edge-to-edge
 * (android/gradle.properties), and on Android 15+ that stops adjustResize from
 * resizing the window, so the built-in avoidance is a no-op there.
 *
 * Wrapped rather than imported directly so the shared defaults live in one place
 * — taps reaching controls behind the keyboard, and a gap between the field and
 * the keyboard top.
 */
export const KeyboardAwareScrollView = forwardRef<
	KeyboardAwareScrollViewRef,
	ScrollViewProps & { bottomOffset?: number; children?: React.ReactNode }
>(
	(
		{ keyboardShouldPersistTaps = "handled", bottomOffset = 16, ...props },
		ref,
	) => (
		<ControllerScrollView
			ref={ref}
			keyboardShouldPersistTaps={keyboardShouldPersistTaps}
			bottomOffset={bottomOffset}
			{...props}
		/>
	),
);
KeyboardAwareScrollView.displayName = "KeyboardAwareScrollView";
