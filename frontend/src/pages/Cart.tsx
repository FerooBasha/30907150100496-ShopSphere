import { useEffect } from "react";
import { ProductCard } from "../components/ProductCard";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useUser } from "../hooks/UseUser";
import { useCart } from "../hooks/UseCart";
import { usePostCheckout } from "../hooks/UseCheckout";

function Cart() {
	const { user, loading } = useUser();
	const { data: cart } = useCart();

	const navigate = useNavigate();
	useEffect(() => {
		if (loading) return;
		if (!user) {
			navigate("/login");
			toast.error("Please log in to use the cart");
		}
	}, [user, loading, navigate]);

	const { mutate: postCheckout, isPending } = usePostCheckout();

	const handleCreateOrder = () => {
		if (!cart || cart.items.length === 0) {
			toast.error("Cart is empty");
			return;
		}
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

		const toastId = toast.loading("Redirecting to checkout...");

		postCheckout(undefined, {
			onError: (error) => {
				toast.error("Couldn't start checkout", {id: toastId})
				console.log(error);
			}
		})

	};

	return (
		<div className="w-screen h-screen mt-10">
			<div
				className="p-5 mx-10 bg-background-300 dark:bg-background-50 dark:border-2 dark:border-background-100 min-h-[80vh] flex flex-col gap-2 
            justify-between items-center rounded-2xl"
			>
				<h1>
					Cart (
					{cart?.items.reduce(
						(accumulator, currentItem) => accumulator + currentItem.quantity,
						0,
					)}{" "}
					Items)
				</h1>
				<div className="flex flex-wrap gap-4 items-start justify-center w-full">
					{cart?.items.map((cartItem) => (
						<ProductCard
							key={cartItem.product.id}
							product={cartItem.product}
							quantity={cartItem.quantity}
						/>
					))}
				</div>
				<div className="flex flex-col items-center">
					<div className="flex">
						<h1>Total: </h1>
						<h1 className="text-primary-500 ml-2">${cart?.totalAmount || 0}</h1>
					</div>
					<button
						onClick={handleCreateOrder}
						disabled={isPending}
						className="w-fit p-3 rounded-2xl mt-4 mb-1 bg-primary-500 hover:bg-primary-600 transition-colors duration-100 "
					>
						<span className="font-bold dark:text-accent-100 text-accent-900">
							Buy Now
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}

export default Cart;
