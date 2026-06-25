import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { AccessibilityInfo } from "react-native";

// Default false (motion on) so a component used outside the provider still works.
const ReducedMotionContext = createContext(false);

export function MotionProvider({ children }: { children: ReactNode }) {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		let mounted = true;
		AccessibilityInfo.isReduceMotionEnabled().then((value) => {
			if (mounted) setReduced(value);
		});
		const sub = AccessibilityInfo.addEventListener(
			"reduceMotionChanged",
			setReduced,
		);
		return () => {
			mounted = false;
			sub.remove();
		};
	}, []);
	return (
		<ReducedMotionContext.Provider value={reduced}>
			{children}
		</ReducedMotionContext.Provider>
	);
}

export function useReducedMotion(): boolean {
	return useContext(ReducedMotionContext);
}
