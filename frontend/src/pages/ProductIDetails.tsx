import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import type { Product } from "./Products";
import toast from "react-hot-toast";
import renderStars from "../util/renderStarts";
import { useAddCart } from "../hooks/UseCart";
import { useProductById } from "../hooks/UseProducts";
import { useUser } from "../hooks/UseUser";
import StarRatingInput from "../components/InputStarRating";
import { useCreateReview } from "../hooks/UseReview";

function ProductItem() {
	const { id } = useParams();
	const { user, loading } = useUser();

	const [currentImage, setCurrentImage] = useState(0);
	const [rating, setRating] = useState(0);
	const [review, setReview] = useState("");

	const { data, error } = useProductById(id);

	const product: Product = data?.data;

	const { mutate: addCart } = useAddCart();

	const navigate = useNavigate();

	const handleAddCart = () => {
		if (loading) {
			toast.loading("User is loading please try again later", {
				duration: 4000,
			});
			return;
		}

		if (!user) {
			navigate("/login");
			toast.error("Please log in to use the cart");
			return;
		}

		const toastId = toast.loading("Adding to cart...");

		addCart(
			{ productId: product.id },
			{
				onSuccess: () => {
					toast.success("Added to cart successfully", { id: toastId });
				},
				onError: (error) => {
					toast.error("Failed to add item to cart", { id: toastId });
					console.log(error);
				},
			},
		);
	};

	useEffect(() => {
		if (!error) return;
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
	}, [error]);

	const { mutate: createReview } = useCreateReview(id);

	const resetFields = () => {
		setRating(0);
		setReview("");
	};

	const handleReviewSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();
		if (!review) {
			toast.error("Review is empty");
			return;
		}
		const toastId = toast.loading("Creating review..");
		createReview(
			{
				id: id ?? "",
				comment: review,
				rating: rating,
			},
			{
				onSuccess: () => {
					toast.success("Review created successfully", { id: toastId });
				},
				onError: (error) => {
					if (error instanceof AxiosError) {
						if (error.response) {
							if (error.response?.status === 401) {
								toast.error("Please login to write a review", { id: toastId });
								return;
							}
							// The server responded with a status code outside the 2xx range
							console.error("Server Error Data:", error.response.data);
							console.error("Status Code:", error.response.status);

							// Target your API's custom message layout (e.g., { message: "..." })
							const apiMessage =
								error.response.data?.message || "Server error occurred";
							toast.error(`Error: ${apiMessage}`, { id: toastId });
						} else if (error.request) {
							// The request was made but no response was received (e.g., network down)
							console.error("No Response Received:", error.request);
							toast.error("Network error: Couldn't Connect to servers.", {
								id: toastId,
							});
						} else {
							// Something happened setting up the request
							console.error("Request Setup Error:", error.message);
							toast.error(`Config Error: ${error.message}`, { id: toastId });
						}
					} else {
						toast.error("An unexpected error has occurred", { id: toastId });
					}
				},
			},
		);
		resetFields();
	};

	return product ? (
		<div className="flex flex-col gap-10 w-screen p-10 pl-5 mt-5">
			<div className="flex gap-5">
				<div className="flex gap-2">
					<div className="flex flex-col gap-2 overflow-y-auto scrollbar-none w-40 h-[50vh]">
						{product?.imageUrls.map((image, index) => (
							<button
								key={image}
								className="group cursor-pointer"
								onClick={() => {
									setCurrentImage(index);
								}}
							>
								<img
									src={image}
									alt={`${product?.name} Image ${currentImage}`}
									className={`rounded-2xl ${index === currentImage ? "border-accent-500 border-3" : "border-background-300 border-2"} group-hover:border-accent-800 object-cover object-center`}
								/>
							</button>
						))}
					</div>
					<img
						src={product?.imageUrls?.[currentImage]}
						alt={`${product?.name} Image ${currentImage}`}
						className="w-[clamp(15rem,35vw,25rem)] object-cover object-center border-6 border-accent-500 rounded-2xl"
					/>
				</div>
				<div className="flex flex-col">
					<h2>{product?.name}</h2>
					<h3 className="-mt-1.5">Category: {product?.category.name}</h3>
					<div className="flex mt-1">
						<div className="flex text-lg">
							{renderStars(product.reviewRating)}
						</div>
						<span className="text-text-500 text-sm">
							&nbsp;({product.reviewCount} Reviews)
						</span>
					</div>
					{/* Div for if there are discounts */}
					<div className="mt-5">
						<h2 className="text-primary-600">${product?.price}</h2>
					</div>
					<button
						className="group w-fit p-3 rounded-2xl mt-8 transition-all duration-150 dark:border-accent-100 dark:bg-secondary-300 
                            bg-secondary-800 hover:scale-110 active:scale-100"
						onClick={handleAddCart}
					>
						<span className="font-bold dark:text-accent-900 text-accent-100">
							Add to Cart
						</span>
					</button>
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<h3>Description:</h3>
				<p>{product?.description}</p>
			</div>
			<form className="flex flex-col gap-5" onSubmit={handleReviewSubmit}>
				<h1>Reviews</h1>
				<div className="flex flex-col gap-3 w-fit bg-background-100 p-5 rounded-2xl">
					<h2>Write a review</h2>
					<h3 className="ml-1 -mb-3">{user?.username}</h3>
					<StarRatingInput value={rating} onChange={setRating} />
					<textarea
						placeholder="Write a review..."
						className="w-[40vw] h-[15vh] max-w-90 bg-background-200 focus:bg-background-300 outline-none ring-0 text-text-900 
                        placeholder:opacity-25 placeholder:text-text-800 p-3 rounded-xl"
						value={review}
						onChange={(e) => setReview(e.target.value)}
					/>

					<button
						className="px-3 py-2.5 rounded-xl bg-linear-to-br from-secondary-400 
                        dark:from-secondary-600 to-accent-500 transition-transform duration-100 ease-in-out 
                        hover:scale-101 not-sm:self-center shadow shadow-black/30
                        active:scale-100"
						type="submit"
					>
						<h3 className="dark:text-text-100 text-text-900 font-bold">
							Post Review
						</h3>
					</button>
				</div>
			</form>
			<div className="w-screen h-[40vh] self-center px-10">
				<div
					className="h-full flex justify-center items-center
				bg-red-500/50 rounded-4xl border-4 border-red-600"
				>
					<h2>Displaying all reviews under construction</h2>
				</div>
			</div>
		</div>
	) : (
		<h1>Loading...</h1>
	);
}

export default ProductItem;
