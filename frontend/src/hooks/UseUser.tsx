import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	type ReactNode,
} from "react";
import api from "../config/axios";
import { AxiosError } from "axios";
import Cookies from "js-cookie";

export interface User {
	id: string;
	username: string;
	email: string;
	role: string;
	imageUrl?: string;
}

interface UserContextType {
	user: User | null;
	setUser: (user: User | null) => void;
	loading: boolean;
	fetchUser: () => Promise<void>;
	logout: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	// Exposed for manual re-syncs
	const fetchUser = useCallback(async () => {
		try {
			const res = await api.get("/auth/me");
			const fetchedUser: User = {
				id: res.data?.id,
				username: res.data?.username,
				email: res.data?.email,
				role: res.data?.role,
				imageUrl: res.data?.imageUrl,
			};
			setUser(fetchedUser);
		} catch (error) {
			if (error instanceof AxiosError && error.response?.status === 401) {
				setUser(null);
			} else {
				console.error("Unexpected auth check error", error);
				setUser(null);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	const logout = useCallback(async () => {
		await api.post("/auth/logout");
		setUser(null);
	}, []);

	useEffect(() => {
		let isMounted = true;
		const isLoggedIn = Cookies.get("isLoggedIn") === "true";
		const checkSession = async () => {
			try {
				if (!isLoggedIn) return;
				const res = await api.get("/auth/me");
				if (!isMounted) return;

				const fetchedUser: User = {
					id: res.data?.id,
					username: res.data?.username,
					email: res.data?.email,
					role: res.data?.role,
					imageUrl: res.data?.imageUrl,
				};
				setUser(fetchedUser);
			} catch (error) {
				if (!isMounted) return;
				if (error instanceof AxiosError && error.response?.status === 401) {
					setUser(null);
				} else {
					console.error("Unexpected auth check error", error);
					setUser(null);
				}
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		checkSession();

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<UserContext.Provider value={{ user, setUser, loading, fetchUser, logout }}>
			{children}
		</UserContext.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
}
