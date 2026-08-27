import { ProductCard } from "./ProductCard";
import type { Product } from "../pages/Products";

interface ProductListProps {
	products: Product[];
}

function ProductList({ products }: ProductListProps) {
	return (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mx-10">
			{products.map((product) => (
				<ProductCard product={product} key={product.id} />
			))}
		</div>
	);
}

export default ProductList;
