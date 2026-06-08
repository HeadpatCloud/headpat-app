const required = (name: string, value: string | undefined): string => {
	if (!value) throw new Error(`Missing env var: ${name}`);
	return value;
};

export const env = {
	apiUrl: required("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL),
};
