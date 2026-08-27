import { UserInfo } from "../components/UserInfo";
import { CgClose } from "react-icons/cg";
import { AiOutlineUpload } from "react-icons/ai";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../hooks/UseUser";

import toast from "react-hot-toast";
import { useUpdatePassword, useUpdateUser } from "../hooks/UseUpdateUser";
import { AxiosError } from "axios";

function Profile() {
	const { user, fetchUser, loading } = useUser();
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [userForum, setUserForum] = useState({
		username: "",
		email: "",
	});
	const [passwordForum, setPasswordForum] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const resetFields = () => {
		setSelectedFile(null);
		setUserForum({
			username: "",
			email: "",
		});
		setPasswordForum({
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		});
		fetchUser();
	};

	const {
		mutate: updateUser,
		isPending,
		isSuccess,
		error: updateUserError,
	} = useUpdateUser();

	const {
		mutate: updatePassword,
		isSuccess: isPasswordSuccess,
		isPending: isPasswordPending,
		error: updatePasswordError,
	} = useUpdatePassword();

	const navigate = useNavigate();

	// Handles success and and error toasts and logging
	useEffect(() => {
		if (isPending || isPasswordPending) {
			return;
		}

		if (isSuccess) {
			toast.success("User updated successfully");
		}
		if (isPasswordSuccess) {
			toast.success("Password changed successfully");
		}
		if (updateUserError) {
			if (updateUserError instanceof AxiosError) {
				if (updateUserError.response) {
					// The server responded with a status code outside the 2xx range
					console.error("Server Error Data:", updateUserError.response.data);
					console.error("Status Code:", updateUserError.response.status);

					// Target your API's custom message layout (e.g., { message: "..." })
					const apiMessage =
						updateUserError.response.data?.message || "Server error occurred";
					toast.error(`Error: ${apiMessage}`);
				} else if (updateUserError.request) {
					// The request was made but no response was received (e.g., network down)
					console.error("No Response Received:", updateUserError.request);
					toast.error("Network error: Couldn't Connect to servers.");
				} else {
					// Something happened setting up the request
					console.error("Request Setup Error:", updateUserError.message);
					toast.error(`Config Error: ${updateUserError.message}`);
				}
			} else {
				toast.error("An unexpected error has occurred");
			}
		}
		if (updatePasswordError) {
			if (updatePasswordError instanceof AxiosError) {
				if (updatePasswordError.response) {
					// The server responded with a status code outside the 2xx range
					console.error(
						"Server Error Data:",
						updatePasswordError.response.data,
					);
					console.error("Status Code:", updatePasswordError.response.status);

					// Target your API's custom message layout (e.g., { message: "..." })
					const apiMessage =
						updatePasswordError.response.data?.message ||
						"Server error occurred";
					toast.error(`Error: ${apiMessage}`);
				} else if (updatePasswordError.request) {
					// The request was made but no response was received (e.g., network down)
					console.error("No Response Received:", updatePasswordError.request);
					toast.error("Network error: Couldn't Connect to servers.");
				} else {
					// Something happened setting up the request
					console.error("Request Setup Error:", updatePasswordError.message);
					toast.error(`Config Error: ${updatePasswordError.message}`);
				}
			} else {
				toast.error("An unexpected error has occurred");
			}
		}
	}, [
		updateUserError,
		isSuccess,
		isPasswordSuccess,
		updatePasswordError,
		isPending,
		isPasswordPending,
	]);

	useEffect(() => {
		if (loading) return;
		if (!user) {
			navigate("/login");
			toast.error("Please log in to view this page");
		}
	}, [user, loading, navigate]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setSelectedFile(file);
		}
	};

	const handleUserSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();

		if (!selectedFile && !userForum.username && !userForum.email) return;

		updateUser({
			file: selectedFile ?? undefined,
			username: userForum.username ?? undefined,
			email: userForum.email ?? undefined,
		});
		resetFields();
	};

	const handlePasswordSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();

		if (
			!passwordForum.currentPassword ||
			!passwordForum.newPassword ||
			!passwordForum.confirmPassword
		) {
			toast.error("Missing one of the password fields");
			return;
		}
		if (passwordForum.confirmPassword !== passwordForum.newPassword) {
			toast.error("Passwords do not match");
			return;
		}
		updatePassword({
			currentPassword: passwordForum.currentPassword,
			newPassword: passwordForum.newPassword,
		});
		resetFields();
	};

	const previewUrl = useMemo(() => {
		if (!selectedFile) return null;
		return URL.createObjectURL(selectedFile);
	}, [selectedFile]);

	useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	}, [previewUrl]);

	return (
		<div className="grid grid-cols-[1fr_3fr] gap-4 w-screen mb-10">
			<UserInfo
				imageUrl={user?.imageUrl}
				username={user?.username}
				email={user?.email}
				role={user?.role}
			/>
			<div className="flex flex-col bg-background-100 mr-8 mt-2 pt-8 px-5 rounded-2xl gap-10">
				<form onSubmit={handleUserSubmit} className="flex flex-col gap-10 pb-5">
					<h1>Update User</h1>
					<div>
						<h2 className="mb-2 ml-2">Profile Picture:</h2>
						<label
							htmlFor="img-upload"
							className="flex flex-col relative gap-2 items-center justify-center py-30 border-4 border-dashed border-background-200 rounded-4xl overflow-hidden"
						>
							<AiOutlineUpload className="text-8xl text-background-200" />
							<h1 className="text-background-200">Upload Image</h1>
							<input
								type="file"
								accept="image/*"
								onChange={handleFileChange}
								disabled={isPending}
								id="img-upload"
								className="hidden"
							/>
							{previewUrl && (
								<button
									className="absolute right-2 top-2 text-5xl text-text-400 hover:text-text-600 cursor-pointer z-10"
									onClick={() => {
										setSelectedFile(null);
									}}
								>
									<CgClose />
								</button>
							)}
							{previewUrl && (
								<img src={previewUrl} alt="preview" className="absolute" />
							)}
						</label>
					</div>
					<div className="ml-2">
						<h2 className="mb-2 ml-2">Username:</h2>
						<input
							type="text"
							placeholder="username"
							value={userForum.username}
							onChange={(e) => {
								setUserForum({ ...userForum, username: e.target.value });
							}}
							className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
						/>
					</div>
					<div className="ml-2">
						<h2 className="mb-2 ml-2">Email:</h2>
						<input
							type="text"
							placeholder="example@example.com"
							value={userForum.email}
							onChange={(e) => {
								setUserForum({ ...userForum, email: e.target.value });
							}}
							className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
						/>
					</div>
					<div className="flex justify-end">
						<button
							className="w-fit px-3 py-2.5 rounded-4xl bg-linear-to-br from-secondary-400 
                        dark:from-secondary-600 to-accent-500 transition-transform duration-100 ease-in-out 
                        hover:scale-105 not-sm:self-center shadow shadow-black/30
                        active:scale-100"
							type="submit"
						>
							<h3 className="dark:text-text-100 text-text-900 font-bold">
								Update User
							</h3>
						</button>
					</div>
				</form>
				<hr className="text-background-200 w-full" />
				<form
					className="flex flex-col gap-10 pb-5"
					onSubmit={handlePasswordSubmit}
				>
					<h1>Change Password</h1>
					<div className="ml-2">
						<h2 className="mb-2 ml-2">Current Password:</h2>
						<input
							type="password"
							placeholder="current password"
							value={passwordForum.currentPassword}
							onChange={(e) => {
								setPasswordForum({
									...passwordForum,
									currentPassword: e.target.value,
								});
							}}
							className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
						/>
					</div>
					<div className="ml-2">
						<h2 className="mb-2 ml-2">New Password:</h2>
						<input
							type="password"
							placeholder="old password"
							value={passwordForum.newPassword}
							onChange={(e) => {
								setPasswordForum({
									...passwordForum,
									newPassword: e.target.value,
								});
							}}
							className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
						/>
					</div>
					<div className="ml-2">
						<h2 className="mb-2 ml-2">Confirm Password:</h2>
						<input
							type="password"
							placeholder="confirm password"
							value={passwordForum.confirmPassword}
							onChange={(e) => {
								setPasswordForum({
									...passwordForum,
									confirmPassword: e.target.value,
								});
							}}
							className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
						/>
					</div>
					<div className="flex justify-end">
						<button
							className="w-fit px-3 py-2.5 rounded-4xl bg-linear-to-br from-secondary-400 
                        dark:from-secondary-600 to-accent-500 transition-transform duration-100 ease-in-out 
                        hover:scale-105 not-sm:self-center shadow shadow-black/30
                        active:scale-100"
							type="submit"
						>
							<h3 className="dark:text-text-100 text-text-900 font-bold">
								Change Password
							</h3>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export default Profile;
