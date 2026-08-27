import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import api from "../config/axios";
import type { Product } from "../pages/Products";

export interface CartItem {
	product: Product;
	quantity: number;
}

export interface Cart {
	id: string;
	userId: string;
	totalAmount: number;
	createdAt: string;
	updatedAt: string;
	items: CartItem[];
}

interface DefaultCartParams {
	productId: string;
}

interface updateCartParams {
	productId: string;
	add: boolean;
}

async function addCart(params: DefaultCartParams) {
	const { data } = await api.post(`/cart/${params.productId}`, params);
	return data;
}

export function useAddCart() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: addCart,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cart"] });
		},
	});
}

async function updateCart(params: updateCartParams) {
	const { productId, add } = params;
	const { data } = await api.put(`/cart/${params.productId}`, {
		productId,
		add: String(add),
	});
	return data;
}

export function useUpdateCart() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateCart,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cart"] });
		},
	});
}

async function deleteCart(params: DefaultCartParams) {
	const { data } = await api.delete(`/cart/${params.productId}`);
	return data;
}

export function useDeleteCart() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteCart,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cart"] });
		},
	});
}
async function fetchCart() {
	const { data } = await api.get<Cart>("/cart/");
	return data;
}

export function useCart(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["cart"],
		queryFn: fetchCart,
		placeholderData: keepPreviousData,
		select: (data) => ({
			...data,
			items: [...data.items].sort((a, b) =>
				a.product.name.localeCompare(b.product.name),
			),
		}),
		enabled: options?.enabled ?? true,
	});
}
