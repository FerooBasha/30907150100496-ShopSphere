import { useMutation } from "@tanstack/react-query";
import api from "../config/axios";

async function postCheckout() {
	const { data } = await api.post("/checkout/session");
	return data.url as string;
}

export const usePostCheckout = () => {
	return useMutation({
		mutationFn: postCheckout,
		onSuccess: (url) => {
			window.location.href = url;
		},
	});
};
