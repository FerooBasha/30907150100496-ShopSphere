import { useSearchParams } from "react-router-dom";

export function useUpdateSearchParams() {
	const [searchParams, setSearchParams] = useSearchParams();

	const updateParams = (updates: Record<string, string | number | null>) => {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			Object.entries(updates).forEach(([key, value]) => {
				if (value === null || value === "") next.delete(key);
				else next.set(key, String(value));
			});
			return next;
		});
	};

	return { searchParams, updateParams };
}
