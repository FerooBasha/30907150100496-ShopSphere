import {
	useQuery,
	keepPreviousData,
	useQueryClient,
	useMutation,
} from "@tanstack/react-query";
import api from "../config/axios";

interface CreateReviewParams {
	id: string;
	comment: string;
	rating: number;
}

interface fetchReviewsParams {
	id: string;
	page: number;
	limit: number;
}

async function fetchProducts(params: fetchReviewsParams) {
	const { id, ...body } = params;
	const res = await api.get(`/products/${id}/rating`, { params: body });
	return res.data;
}

export function useProducts(params: fetchReviewsParams) {
	const { id, ...rest } = params;
	return useQuery({
		queryKey: ["reviews", id, rest],
		queryFn: () => fetchProducts(params),
		placeholderData: keepPreviousData,
	});
}

async function createReview(params: CreateReviewParams) {
	const { id, ...body } = params;

	const { data } = await api.post(`/products/${id}/rating`, body);

	return data;
}

export function useCreateReview(id: string | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createReview,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["reviews", id] });
			queryClient.invalidateQueries({ queryKey: ["productById", id] });
		},
	});
}
