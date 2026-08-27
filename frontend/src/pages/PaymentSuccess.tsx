import { AiOutlineCheckCircle } from "react-icons/ai";
import { Link } from "react-router-dom";
function PaymentSuccess() {
	return (
		<div className="w-screen h-screen p-10">
			<div className="h-full flex flex-col items-center pt-20 p-10 gap-10">
				<h1 className="flex items-center gap-3">
					Order created successfully.{" "}
					<AiOutlineCheckCircle className="text-green-400 mt-2.5" />
				</h1>
				<h2>Thank you for your purchase.</h2>
				<Link
                to="/products"
					className="w-fit p-3 rounded-2xl mb-1 bg-accent-500 hover:bg-accent-600 transition-colors duration-100 mt-[10vh]"
				>
					<span className="font-bold dark:text-accent-100 text-accent-900">
						Continue Shopping
					</span>
				</Link>
			</div>
		</div>
	);
}

export default PaymentSuccess;
