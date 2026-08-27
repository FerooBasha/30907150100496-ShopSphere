import { type PropsWithChildren } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../config/axios";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import type { User } from "../hooks/UseUser";

interface DropdownProps {
	isOpen: boolean;
	user: User | null;
	logout: () => void;
	handleToggle: () => void;
}

function Dropdown({
	user,
	isOpen,
	handleToggle,
	logout,
	children,
}: PropsWithChildren<DropdownProps>) {
	const navigate = useNavigate();
	const handleLogout = async () => {
		try {
			await api.post("/auth/logout");
			logout();
			handleToggle();
			navigate("/", { replace: true });
			toast.success("Logged out successfully");
		} catch (error) {
			if (error instanceof AxiosError) {
				if (error.response) {
					// The server responded with a status code outside the 2xx range
					console.error("Server Error Data:", error.response.data);
					console.error("Status Code:", error.response.status);

					// Target your API's custom message layout (e.g., { message: "..." })
					const apiMessage =
						error.response.data?.message || "Server error occurred";
					toast.error(`Error: ${apiMessage}`);
				} else if (error.request) {
					// The request was made but no response was received (e.g., network down)
					console.error("No Response Received:", error.request);
					toast.error("Network error: Couldn't Connect to servers.");
				} else {
					// Something happened setting up the request
					console.error("Request Setup Error:", error.message);
					toast.error(`Config Error: ${error.message}`);
				}
			} else {
				toast.error("An unexpected error has occurred");
			}
			console.error(error);
		}
	};

	return (
		<div className="relative inline-block text-left">
			<div>{children}</div>

			{isOpen && (
				<div
					className="origin-top-right absolute right-0 mt-2 w-56 
                    rounded-md shadow-lg bg-background-100 ring-1 ring-black
                    focus:outline-none"
				>
					{user ? (
						<div className="py-1" role="none">
							<Link
								to="/profile"
								className="block px-4 py-2 text-sm text-text-900
                            hover:bg-background-200"
								onClick={handleToggle}
							>
								Profile
							</Link>
							{user?.role === "ADMIN" && (
								<Link
									to="/admin"
									className="block px-4 py-2 text-sm text-text-900
                            hover:bg-background-200"
									onClick={handleToggle}
								>
									Admin
								</Link>
							)}
							<button
								className="block w-full text-start px-4 py-2 text-sm text-red-400
                            hover:bg-background-200"
								onClick={handleLogout}
							>
								Logout
							</button>
						</div>
					) : (
						<div className="py-1" role="none">
							<Link
								to="/login"
								className="block px-4 py-2 text-sm text-text-900
                            hover:bg-background-200"
								onClick={handleToggle}
							>
								Login
							</Link>
							<Link
								to="/register"
								className="block px-4 py-2 text-sm text-text-900
                            hover:bg-background-200"
								onClick={handleToggle}
							>
								Register
							</Link>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default Dropdown;
