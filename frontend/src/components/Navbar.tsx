import { BiCart } from "react-icons/bi";
import { AiOutlineUser } from "react-icons/ai";
import { BiSearchAlt2 } from "react-icons/bi";
import { BiChevronDown } from "react-icons/bi";
import {
	Link,
	useLocation,
	useNavigate,
	useSearchParams,
} from "react-router-dom";
import Dropdown from "./Dropdown";
import { useState } from "react";
import { useUser } from "../hooks/UseUser";
import { useCart } from "../hooks/UseCart";

function Navbar() {
	const { user, logout } = useUser();
	const { data: cart } = useCart({
		enabled: !!user,
	});

	const [isOpen, setIsOpen] = useState(false);

	const [isCategoryOpen, setIsCategoryOpen] = useState(false);
	const handleToggleDropdown = () => {
		setIsOpen(!isOpen);
	};

	const categories = [
		{ name: "GPU", slug: "gpu" },
		{ name: "CPU", slug: "cpu" },
		{ name: "RAM", slug: "ram" },
		{ name: "Storage", slug: "storage" },
		{ name: "Monitor", slug: "monitor" },
		{ name: "Peripherals", slug: "peripherals" },
		{ name: "Networking", slug: "networking" },
		{ name: "Audio", slug: "audio" },
	];

	const [searchParams] = useSearchParams();
	const currentCategory = searchParams.get("category") ?? "";

	const navigate = useNavigate();
	const location = useLocation();

	const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			const search = e.currentTarget.value;
			const params = new URLSearchParams(
				location.pathname === "/products" ? location.search : "",
			);

			if (search.trim() === "") {
				params.delete("search");
			} else {
				params.set("search", search);
			}
			params.delete("currentPage");

			navigate(`/products?${params.toString()}`);
		}
	};

	return (
		<nav className="w-screen sticky">
			<div className="bg-background-50 flex py-2.5 px-2 items-center justify-between">
				<div className="flex items-center lg:gap-15 gap-2">
					<Link to="/">
						<h2 className="text-primary-500">Bricked Lemons</h2>
					</Link>
					<div className="flex lg:gap-8 gap-2">
						<div className="relative">
							<button
								className="flex items-center"
								onClick={() => {
									setIsCategoryOpen(!isCategoryOpen);
								}}
							>
								<h3>Categories</h3>
								<BiChevronDown
									className={`text-text-900 w-5 ${isCategoryOpen && "rotate-180"}`}
								/>
							</button>
							{/* SCGF (Small Claude Generated Function) */}
							{isCategoryOpen && (
								<ul className="absolute top-full left-0 mt-2 bg-background-50 border border-background-100 shadow-md rounded-md py-1 z-10">
									{categories.map((cat) => (
										<li key={cat.slug}>
											<Link
												to={`/products?category=${encodeURIComponent(cat.slug)}`}
												className={`block px-4 py-2  hover:text-text-500 ${cat.slug === currentCategory ? "text-text-500" : "text-text-900"}`}
												onClick={() => setIsCategoryOpen(false)}
											>
												{cat.name}
											</Link>
										</li>
									))}
								</ul>
							)}
						</div>
						<Link to="/products?orderDirection=asc&orderBy=price">
							<h3>Deals</h3>
						</Link>
						<Link to="/products?orderDirection=desc&orderBy=createdAt">
							<h3>What's New</h3>
						</Link>
					</div>
				</div>
				<div className="flex gap-5 mr-3">
					<div
						className="flex flex-1 items-center justify-between lg:w-[33vw] pr-2 pl-2.5 py-0.5 bg-background-200 rounded-xl 
					shadow-lg dark:focus-within:shadow-accent-600/20 focus-within:shadow-accent-400/60 transition-all duration-200"
					>
						<input
							type="text"
							className="w-[90%] h-full outline-none ring-0 text-text-900 placeholder:opacity-25 placeholder:text-text-600"
							placeholder="Search..."
							onKeyDown={handleSearch}
						/>
						<BiSearchAlt2 className="text-2xl text-secondary-500" />
					</div>
					<Dropdown
						user={user ?? null}
						isOpen={isOpen}
						handleToggle={handleToggleDropdown}
						logout={logout}
					>
						<button
							onClick={handleToggleDropdown}
							className={`rounded-4xl flex items-center gap-1 text-text-900 ${!user && "mr-2"}`}
						>
							{user?.imageUrl ? (
								<img
									src={user?.imageUrl}
									alt="Profile Image"
									className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-md"
								/>
							) : (
								<AiOutlineUser className="text-3xl" />
							)}

							<span>{user ? user?.username : "Account"}</span>
						</button>
					</Dropdown>

					{user && (
						<Link
							to="/cart"
							className="relative rounded-4xl text-text-900 mr-2 "
						>
							<BiCart className="text-3xl" />
							<span className="sr-only">Cart</span>
							{cart?.items && cart?.items.length !== 0 && (
								<span className="absolute -top-0.5 -right-1.5 bg-red-500 px-1 rounded-4xl text-xs">
									{(() => {
										const totalQuantity = cart.items.reduce(
											(sum, item) => sum + item.quantity,
											0,
										);
										return totalQuantity > 99 ? "99+" : totalQuantity;
									})()}
									<span className="sr-only">Items</span>
								</span>
							)}
						</Link>
					)}
				</div>
			</div>
			<hr className="w-full border-t-background-100" />
		</nav>
	);
}

export default Navbar;
