import { useMutation } from "@tanstack/react-query";
import api from "../config/axios";

interface ChangeRoleParams {
    email: string,
	isAdmin: boolean
}

async function changeRole(params: ChangeRoleParams) {
			console.log(params);
	const res = await api.put("/auth/admin/changeUserRole/", params );
	return res.data;
}

export const useChangeRole = () => {
	return useMutation({
		mutationFn: changeRole,
	});
};
