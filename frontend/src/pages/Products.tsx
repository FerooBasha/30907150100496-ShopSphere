import { BiChevronRight } from "react-icons/bi";
import { BiChevronLeft } from "react-icons/bi";
import { BiLastPage } from "react-icons/bi";
import { BiFirstPage } from "react-icons/bi";
import { Select } from "../components/Select";
import { useEffect } from "react";
import ProductList from "../components/ProductList";
import { Link, useSearchParams } from "react-router-dom";
import getPageSelectorList from "../util/pageSelectorHelper";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { useProducts } from "../hooks/UseProducts";

interface Category {
	id: string
	name: string
	slug: string
	description: string
	createdAt: string
	updatedAt: string
}

export interface Product {
	id: string;
	name: string;
	price: number;
	category: Category;
	imageKeys: string[];
	imageUrls: string[];
	description: string;
	reviewRating: number;
	reviewCount: number;
	createdAt: string;
}

function Products() {
	const [searchParams, setSearchParams] = useSearchParams();

	const currentPage = Number(searchParams.get("currentPage")) || 1;
	const limit = Number(searchParams.get("limit")) || 20;
	const maxPrice = searchParams.get("maxPrice") ?? "";
	const minPrice = searchParams.get("minPrice") ?? "";
	const category = searchParams.get("category") ?? "";
	const sortBy = searchParams.get("orderBy") ?? "";
	const sortDir = searchParams.get("orderDirection") ?? "";
	const search = searchParams.get("search") ?? "";

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

	const { data, isLoading, error } = useProducts({
		limit: limit || 20,
		page: currentPage,
		category,
		minPrice,
		maxPrice,
		orderBy: sortBy,
		orderDirection: sortDir || "asc",
		search: search || "",
	});

	const products = data?.data;
	const totalPages = data?.pagination?.totalPages || 1;

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
	const pageSelectorList = getPageSelectorList(totalPages, currentPage);

	return (
		<div className="flex flex-col gap-13">
			{/* Hero */}
			<div className="w-screen h-[30vh] px-10">
				<div
					className="bg-background-100 w-full h-full grid grid-cols-1 md:grid-cols-2 
                overflow-hidden"
				>
					<div className="pl-5 flex flex-col gap-5">
						<h1 className="text-[clamp(1.8rem,3vw,5rem)] text-accent-600">
							Get All The PC Components You Need Here.
						</h1>
						{/* TODO: Handle this better */}
						<Link
							to="/cart"
							className="ml-4 w-fit p-3 dark:bg-secondary-200 bg-secondary-500 rounded-4xl hover:scale-110 
                            transition-all duration-100 not-md:self-center not-md:ml-0 not-md:mt-10"
						>
							<span className="font-bold text-accent-900">Buy Now</span>
						</Link>
					</div>
					<img
						src="https://freepngimg.com/thumb/computer/32745-9-gaming-computer-transparent.png"
						className="h-[30vh] not-md:hidden shrink-0 self-center justify-self-center -mr-30"
					/>
				</div>
			</div>
			{/* Filters and Sort */}
			<div className="flex justify-between mx-10">
				<div className="flex gap-5">
					<Select
						name="Category"
						slug="category"
						options={
							[
								"GPU",
								"CPU",
								"RAM",
								"Storage",
								"Monitor",
								"Peripherals",
								"Networking",
								"Audio",
							] as string[]
						}
						values={[
							"gpu",
							"cpu",
							"ram",
							"storage",
							"monitor",
							"peripherals",
							"networking",
							"audio",
						]}
						updateParams={updateParams}
						searchParams={searchParams}
					/>
					<Select
						name="Limit"
						slug="limit"
						options={[5, 10, 20, 30, 50, 100] as number[]}
						updateParams={updateParams}
						searchParams={searchParams}
					/>
					<Select
						name="Min Price"
						slug="minPrice"
						options={[10, 100, 200, 300, 400, 500, 800, 1000, 1200] as number[]}
						values={[9, 99, 199, 299, 399, 499, 799, 999, 1199] as number[]}
						updateParams={updateParams}
						searchParams={searchParams}
					/>
					<Select
						name="Max Price"
						slug="maxPrice"
						options={
							[30, 100, 200, 300, 400, 500, 800, 1000, 1200, 1600] as number[]
						}
						updateParams={updateParams}
						searchParams={searchParams}
					/>
				</div>
				<div className="flex gap-5">
					<Select
						name="Sort Direction"
						slug="orderDirection"
						options={["Ascending", "Descending"] as string[]}
						values={["asc", "desc"]}
						updateParams={updateParams}
						searchParams={searchParams}
					/>
					<Select
						name="Sort By"
						slug="orderBy"
						options={["Recent", "Price", "Rating", "Name"] as string[]}
						values={["createdAt", "price", "reviewRating", "name"] as string[]}
						updateParams={updateParams}
						searchParams={searchParams}
					/>
				</div>
			</div>
			{/* Products */}
			{isLoading ? (
				<h1 className="mx-10">Loading...</h1>
			) : (
				<ProductList products={products} />
			)}
			{/* Pagination Selector */}
			<div className="flex justify-center items-center h-[10vh] -mt-10">
				<button
					className="hover:cursor-pointer"
					onClick={() => updateParams({ currentPage: 1 })}
				>
					<BiFirstPage className="text-accent-900 hover:text-accent-700 text-4xl" />
				</button>
				<button
					className="hover:cursor-pointer"
					onClick={() =>
						updateParams({ currentPage: Math.max(currentPage - 1, 1) })
					}
				>
					<BiChevronLeft className="text-accent-900 hover:text-accent-700 text-4xl" />
				</button>
				<div className="flex gap-2">
					{pageSelectorList.map((num) => (
						<button
							className="hover:cursor-pointer"
							onClick={() => updateParams({ currentPage: num })}
							key={num}
						>
							<span
								className={`text-3xl font-semibold p-1 hover:text-accent-700 ${currentPage === num ? "text-accent-500" : "text-accent-800"}`}
							>
								{num}
							</span>
						</button>
					))}
				</div>
				<button
					className="hover:cursor-pointer"
					onClick={() =>
						updateParams({ currentPage: Math.min(totalPages, currentPage + 1) })
					}
				>
					<BiChevronRight className="text-accent-900 hover:text-accent-700 text-4xl" />
				</button>
				<button
					className="hover:cursor-pointer"
					onClick={() => updateParams({ currentPage: totalPages })}
				>
					<BiLastPage className="text-accent-900 hover:text-accent-700 text-4xl" />
				</button>
			</div>
		</div>
	);
}

export default Products;
