import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

const THEME_VARIANTS = {
	amber:
		"bg-gradient-to-br from-amber-700 via-indigo-950 to-emerald-950 text-amber-100",
	cosmic:
		"bg-gradient-to-tl from-violet-800 via-blue-600 to-slate-950 text-cyan-100",
	fuchsia: "bg-gradient-to-br from-pink-500 via-fuchsia-600 to-blue-950",
	grape: "bg-gradient-to-br from-purple-800 to-slate-950 text-purple-100",
	rainbow:
		"bg-gradient-to-br from-cyan-500 via-purple-700 to-rose-500 text-white",
};

type VariantType = keyof typeof THEME_VARIANTS;

interface CategoryCardProps {
	title: string;
	slug: string
	variant?: VariantType;
}

function CategoryCard({
	variant = "amber",
	title,
	slug,
	children,
}: PropsWithChildren<CategoryCardProps>) {
	const variantClass = THEME_VARIANTS[variant] || THEME_VARIANTS.amber;

	return (
		<Link 
			to={`/products?category=${slug}`}
			className={`h-70 min-w-[10vw] ${variantClass} rounded-2xl relative grid grid-rows-[1fr_3fr] gap-3 place-content-center place-items-center overflow-hidden shadow-[2px_2px_15px_transparent] dark:hover:shadow-accent-600/30 hover:shadow-black/75 transition-all duration-300`}
		>
			<h3 className="text-950 dark:text-text-50 font-bold z-1 absolute top-5">{title}</h3>
			{children}
		</Link>
	);
}

export default CategoryCard;
