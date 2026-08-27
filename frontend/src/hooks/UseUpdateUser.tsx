import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../config/axios";

interface UpdateUserParams {
	file?: File;
	username?: string;
	email?: string;
}

interface UpdatePasswordParams {
	currentPassword: string;
	newPassword: string;
}

const updateUser = async ({ file, username, email }: UpdateUserParams) => {
	const formData = new FormData();

	if (file) {
		formData.append("image", file);
	}

	if (username) {
		formData.append("username", username);
	}

	if (email) {
		formData.append("email", email);
	}

	const { data } = await api.put("auth/me", formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});

	return data;
};

interface UpdatePasswordParams {
	currentPassword: string;
	newPassword: string;
}

const updatePassword = async ({ currentPassword, newPassword }: UpdatePasswordParams) => {
	const { data } = await api.put("auth/me/password", {currentPassword, newPassword});
    return data
};

export const useUpdateUser = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateUser,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["updateUser"] });
		},
	});
};
export const useUpdatePassword = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updatePassword,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["updatePassword"] });
		},
	});
};

