import {
	useQuery,
	keepPreviousData,
	useQueryClient,
	useMutation,
} from "@tanstack/react-query";
import api from "../config/axios";

interface ProductsParams {
	limit: number;
	page: number;
	category: string;
	minPrice: number | string;
	maxPrice: number | string;
	orderBy: string;
	orderDirection: string;
	search: string;
}
interface CreateProductParams {
	name: string;
	description: string;
	price: number;
	category: string;
	images?: File[];
}

async function fetchProducts(params: ProductsParams) {
	const res = await api.get("/products/", { params });
	return res.data;
}

export function useProducts(params: ProductsParams) {
	return useQuery({
		queryKey: ["products", params],
		queryFn: () => fetchProducts(params),
		placeholderData: keepPreviousData,
	});
}

async function fetchProductById(id: string) {
	const res = await api.get(`/products/${id}`);
	return res.data;
}

export function useProductById(id: string | undefined) {
	return useQuery({
		queryKey: ["productById", id],
		queryFn: () => fetchProductById(id as string),
		placeholderData: keepPreviousData,
		enabled: !!id,
	});
}

async function createProduct(params: CreateProductParams) {
	const formData = new FormData();

	formData.append("name", params.name);
	formData.append("description", params.description);
	formData.append("price", String(params.price));
	formData.append("category", params.category);

	if (params.images) {
		params.images.forEach((image) => {
			formData.append("image", image);
		});
	}

	const { data } = await api.post("/products/", formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});

	return data;
}

export function useCreateProduct() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["products"] });
		},
	});
}
