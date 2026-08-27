import React, { useEffect, useState } from "react";
import { UserInfo } from "../components/UserInfo";
import { useUser } from "../hooks/UseUser";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useChangeRole } from "../hooks/UseChangeRole";
import { AxiosError } from "axios";
import { AiOutlineUpload } from "react-icons/ai";
import { useCreateProduct } from "../hooks/UseProducts";

function Admin() {
	const { user, fetchUser, loading } = useUser();
	const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);
	const [productForum, setProductForum] = useState({
		name: "",
		price: 0,
		category: "",
		description: "",
	});
	const [userManagementForum, setUserManagementForum] = useState({
		makeAdmin: "",
		removeAdmin: "",
	});

	const resetFields = () => {
		setSelectedFiles(null);
		setProductForum({
			name: "",
			price: 0,
			category: "",
			description: "",
		});

		setUserManagementForum({
			makeAdmin: "",
			removeAdmin: "",
		});
		fetchUser();
	};

	const navigate = useNavigate();

	useEffect(() => {
		if (loading) return;
		if (user?.role !== "ADMIN") {
			navigate("/");
			toast.error("Forbidden from this route");
		}
	}, [user, loading, navigate]);

	const {
		mutate: changeRole,
		isSuccess: isSuccess,
		isPending: isPending,
		error: error,
	} = useChangeRole();

	const {
		mutate: createProduct,
		isSuccess: isProductSuccess,
		isPending: isProductPending,
		error: productError,
	} = useCreateProduct();

	const MAX_IMAGES = 5;

	function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files ?? []);

		if (files.length > MAX_IMAGES) {
			toast.error("Maximum of 5 images");
			return;
		}

		setSelectedFiles(files);
	}

	useEffect(() => {
		if (isPending || isProductPending) {
			return;
		}

		if (isSuccess) {
			toast.success("User updated successfully");
		}
		if (isProductSuccess) {
			toast.success("Product created successfully");
		}

		if (error) {
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
		}
		if (productError) {
			if (productError instanceof AxiosError) {
				if (productError.response) {
					// The server responded with a status code outside the 2xx range
					console.error("Server Error Data:", productError.response.data);
					console.error("Status Code:", productError.response.status);

					// Target your API's custom message layout (e.g., { message: "..." })
					const apiMessage =
						productError.response.data?.message || "Server error occurred";
					toast.error(`Error: ${apiMessage}`);
				} else if (productError.request) {
					// The request was made but no response was received (e.g., network down)
					console.error("No Response Received:", productError.request);
					toast.error("Network error: Couldn't Connect to servers.");
				} else {
					// Something happened setting up the request
					console.error("Request Setup Error:", productError.message);
					toast.error(`Config Error: ${productError.message}`);
				}
			} else {
				toast.error("An unexpected error has occurred");
			}
		}
	}, [
		error,
		productError,
		isSuccess,
		isProductSuccess,
		isPending,
		isProductPending,
	]);

	useEffect(() => {
		console.log(selectedFiles);
		if (selectedFiles && selectedFiles.length === 0) {
			toast.success("Images Saved");
		}
	}, [selectedFiles]);

	const handleChangeRole = (email: string, isAdmin: boolean) => {
		if (!email) {
			toast.error("User Email field empty");
			return;
		}
		if (email === user?.email) {
			toast.error("You can't remove admin from yourself");
			return;
		}

		changeRole({ email, isAdmin });
		resetFields();
	};

	const handleProductSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();
		if (
			!productForum.name ||
			!productForum.price ||
			!productForum.category ||
			!productForum.description
		) {
			toast.error("Please provide all required fields");
			return;
		}
		if (!selectedFiles || selectedFiles.length === 0) {
			toast.error("Upload at least 1 image");
			return;
		}
		createProduct({
			name: productForum.name,
			price: productForum.price,
			description: productForum.description,
			category: productForum.category,
			images: selectedFiles,
		});
		resetFields();
	};

	return (
		<div className="grid grid-cols-[1fr_3fr] gap-4 w-screen mb-10">
			<UserInfo
				imageUrl={user?.imageUrl}
				username={user?.username}
				email={user?.email}
				role={user?.role}
			/>
			<div className="flex flex-col bg-background-100 mr-8 mt-2 pt-8 px-5 rounded-2xl gap-10">
				<h1>User Management</h1>
				<hr className="text-background-200" />
				<h1>Make Admin</h1>
				<div className="flex justify-between">
					<div>
						<h2 className="mb-2 ml-2">User Email:</h2>
						<input
							type="text"
							placeholder="example@example.com"
							className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
							value={userManagementForum.makeAdmin}
							onChange={(e) => {
								setUserManagementForum({
									...userManagementForum,
									makeAdmin: e.target.value,
								});
							}}
						/>
					</div>
					<button
						className="w-fit h-fit self-end px-3 py-2.5 rounded-4xl bg-linear-to-br from-secondary-400 
                        dark:from-secondary-600 to-accent-500 transition-transform duration-100 ease-in-out 
                        hover:scale-105 not-sm:self-center shadow shadow-black/30
                        active:scale-100"
						onClick={() => {
							handleChangeRole(userManagementForum.makeAdmin, true);
						}}
					>
						<h3 className="dark:text-text-100 text-text-900 font-bold">
							Make Admin
						</h3>
					</button>
				</div>
				<div className="flex justify-between">
					<div>
						<h2 className="mb-2 ml-2">User Email:</h2>
						<input
							type="text"
							placeholder="example@example.com"
							className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
							placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
							value={userManagementForum.removeAdmin}
							onChange={(e) => {
								setUserManagementForum({
									...userManagementForum,
									removeAdmin: e.target.value,
								});
							}}
						/>
					</div>
					<button
						className="w-fit h-fit self-end px-3 py-2.5 rounded-4xl bg-red-500 transition-transform duration-100 ease-in-out 
                        hover:scale-105 not-sm:self-center shadow shadow-black/30
                        active:scale-100"
						onClick={() => {
							handleChangeRole(userManagementForum.removeAdmin, false);
						}}
					>
						<h3 className="dark:text-text-100 text-text-900 font-bold">
							Remove Admin
						</h3>
					</button>
				</div>
				<hr className="text-background-200" />
				<h1>Create Product</h1>
				<hr className="text-background-200" />
				<form
					className="flex flex-col gap-10 pb-5"
					onSubmit={handleProductSubmit}
				>
					<div>
						<h2 className="mb-2 ml-2">Product Pictures:</h2>
						<label
							htmlFor="img-upload"
							className="flex flex-col relative gap-2 items-center justify-center py-30 border-4 border-dashed border-background-200 rounded-4xl overflow-hidden"
						>
							<AiOutlineUpload className="text-8xl text-background-200" />
							<h1 className="text-background-200">Upload Images</h1>
							<input
								type="file"
								accept="image/*"
								multiple
								id="img-upload"
								className="hidden"
								onChange={handleImageChange}
							/>
						</label>
					</div>
					<div>
						<h2 className="mb-2 ml-2">Product Name:</h2>
						<input
							type="text"
							placeholder="example product"
							className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
							value={productForum.name}
							onChange={(e) => {
								setProductForum({
									...productForum,
									name: e.target.value,
								});
							}}
						/>
					</div>
					<div>
						<h2 className="mb-2 ml-2">Product Price:</h2>
						<input
							type="number"
							placeholder="price"
							className="w-[8vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
							value={productForum.price}
							onChange={(e) => {
								setProductForum({
									...productForum,
									price: Math.max(0, Number(e.target.value)),
								});
							}}
						/>
					</div>
					<div>
						<h2 className="mb-2 ml-2">Product Category:</h2>
						<input
							type="text"
							placeholder="category"
							className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-3xl"
							value={productForum.category}
							onChange={(e) => {
								setProductForum({
									...productForum,
									category: e.target.value.toLocaleLowerCase(),
								});
							}}
						/>
					</div>
					<div>
						<h2 className="mb-2 ml-2">Product Description:</h2>
						<textarea
							placeholder="description..."
							className="w-[30vw] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-xl"
							value={productForum.description}
							onChange={(e) => {
								setProductForum({
									...productForum,
									description: e.target.value,
								});
							}}
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
								Create Product
							</h3>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export default Admin;
