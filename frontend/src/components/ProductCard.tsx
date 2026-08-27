import { AiOutlineMinusCircle, AiOutlinePlusCircle } from "react-icons/ai";
import type { Product } from "../pages/Products";
import renderStars from "../util/renderStarts";
import { Link, useNavigate } from "react-router-dom";
import { useAddCart, useDeleteCart, useUpdateCart } from "../hooks/UseCart";
import { useUser } from "../hooks/UseUser";
import toast from "react-hot-toast";

interface ProductCardProps {
	product: Product;
	quantity?: number;
}

export function ProductCard({ product, quantity }: ProductCardProps) {
	const { user, loading } = useUser();

	const { mutate: addCart } = useAddCart();

	const navigate = useNavigate();

	const { mutate: updateCart, isPending: isUpdatePending } = useUpdateCart();

	const handleAddQuantity = (add: boolean) => {
		if (isUpdatePending) return;
		const toastId = toast.loading("Changing item quantity...");

		updateCart(
			{ productId: product.id, add },
			{
				onSuccess: () => {
					toast.success("Updated item quantity successfully", { id: toastId });
				},
				onError: (error) => {
					toast.error("Failed to update item quantity", { id: toastId });
					console.log(error);
				},
			},
		);
	};

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
	const { mutate: deleteCart, isPending: isDeletePending } = useDeleteCart();
	const handleRemoveCart = () => {
		const toastId = toast.loading("Removing from cart...");

		deleteCart(
			{ productId: product.id },
			{
				onSuccess: () => {
					toast.success("Removed from cart successfully", { id: toastId });
				},
				onError: (error) => {
					toast.error("Failed to remove item from cart", { id: toastId });
					console.log(error);
				},
			},
		);
	};

	return (
		<Link
			to={`/products/${product.id}`}
			className="w-65 overflow-hidden flex flex-col gap-2 bg-background-100 p-3 rounded-2xl hover:bg-background-200 transition-colors duration-90"
		>
			<h3 className="truncate">{product.name}</h3>
			<img
				src={product.imageUrls[0]}
				alt={product.name}
				className="w-65 h-45 object-cover object-center border-6 border-accent-500 rounded-2xl mb-4"
			/>
			<h3 className="text-primary-500">${product.price}</h3>
			<div className="flex -mt-2">
				<div className="flex text-lg">{renderStars(product.reviewRating)}</div>
				<span className="text-text-500 text-sm">
					({product.reviewCount} Reviews)
				</span>
			</div>
			{!quantity ? (
				<button
					className="group w-fit p-3 rounded-2xl mt-4 mb-1 border-2 border-accent-500 dark:bg-accent-900 bg-accent-100
                transition-all duration-100 active:scale-95 dark:hover:border-accent-100 hover:border-accent-900 dark:hover:bg-secondary-300 
				hover:bg-secondary-800"
					onClick={(e) => {
						e.preventDefault();
						handleAddCart();
					}}
				>
					<span
						className="font-bold dark:text-accent-100 text-accent-900 dark:group-hover:text-accent-900 group-hover:text-accent-100
                    transition-colors duration-100"
					>
						Add to Cart
					</span>
				</button>
			) : (
				<div className="flex justify-between mt-4 mb-1">
					<button
						className="w-fit p-3 rounded-2xl bg-red-600 hover:bg-red-400 transition-all duration-100 active:scale-95"
						onClick={(e) => {
							e.preventDefault();
							handleRemoveCart();
						}}
						disabled={isDeletePending}
					>
						<span className="font-bold dark:text-accent-100 text-accent-900">
							Remove
						</span>
					</button>
					<div className="flex items-center gap-2 text-2xl text-text-900">
						<button
							className="cursor-pointer"
							onClick={(e) => {
								e.preventDefault();
								handleAddQuantity(false);
							}}
							disabled={isUpdatePending}
						>
							<AiOutlineMinusCircle />
						</button>
						<span>{quantity}</span>
						<button
							className="cursor-pointer"
							onClick={(e) => {
								e.preventDefault();
								handleAddQuantity(true);
							}}
							disabled={isUpdatePending}
						>
							<AiOutlinePlusCircle />
						</button>
					</div>
				</div>
			)}
		</Link>
	);
}
