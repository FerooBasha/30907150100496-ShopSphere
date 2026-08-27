import { CgProfile } from "react-icons/cg";
import { useState } from "react";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import api from "../config/axios";
import { useUser } from "../hooks/UseUser";

function Login() {
	const [forum, setForum] = useState({
		email: "",
		password: "",
	});

	const { fetchUser } = useUser();
	const navigate = useNavigate();

	// On submit query database for user and show toast based on Error or success
	const handleSubmit = async () => {
		// If email or password are empty how error toast
		if (!forum.email || !forum.password) {
			toast.error("Email and Password are required");
			return;
		}
		try {
			const res = await api.post("/auth/login", forum);
			// On Success reset forum state and setUser Context then go to home page
			if (res.status === 200) {
				setForum({ email: "", password: "" });
				fetchUser();

				navigate("/", { replace: true });
				toast.success("Logged in successfully");
			}
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
		<div className="h-screen w-screen flex items-center justify-center">
			<form
				onSubmit={(e) => e.preventDefault()}
				className="bg-background-100 flex flex-col items-center gap-8 p-10 rounded-xl"
			>
				<CgProfile className="text-9xl text-text-300 dark:bg-background-800 rounded-full -mb-3" />
				<div>
					<h3 className="mb-3 ml-2">Email:</h3>
					<input
						type="text"
						placeholder="example@example.com"
						onChange={(e) => {
							setForum({ ...forum, email: e.target.value });
						}}
						className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
					/>
				</div>
				<div className="-mt-3">
					<h3 className="mb-3 ml-2">Password:</h3>
					<input
						type="password"
						placeholder="password"
						onChange={(e) => {
							setForum({ ...forum, password: e.target.value });
						}}
						className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
					/>
				</div>
				<button
					className="bg-primary-500 w-full p-3 mt-6 rounded-3xl hover:bg-primary-600 shadow-md 
                dark:hover:shadow-accent-600/20 hover:shadow-accent-400/60 active:bg-primary-400 transition-colors duration-100"
					onClick={handleSubmit}
				>
					<h2 className="text-text-100">Login</h2>
				</button>
			</form>
		</div>
	);
}

export default Login;
