import { AiOutlineUser } from "react-icons/ai";

interface userInfoProps {
	imageUrl: string | undefined;
	username: string | undefined;
	email: string | undefined;
	role: string | undefined;
}

export function UserInfo({ imageUrl, username, email, role }: userInfoProps) {
	return (
		<div className="grid grid-rows-[1fr_4fr] gap-10 bg-background-100 ml-2 mt-2 pt-8 rounded-2xl pr-4">
			<div className="flex flex-col items-center justify-center gap-4">
				{imageUrl ? (
					<img
						src={imageUrl}
						alt="Profile Image"
						className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md"
					/>
				) : (
					<AiOutlineUser className="text-6xl text-text-950 rounded-full bg-background-300 w-24 h-24" />
				)}
				<h2 className="text-primary-500">{username}</h2>
			</div>
			<div className="flex flex-col gap-2 pl-4">
				<h3>
					Username: <br />{" "}
					<span className="ml-2 text-primary-500">{username}</span>
				</h3>
				<h3>
					Email: <br /> <span className="ml-2 font-bold">{email}</span>
				</h3>
				<h3>
					Role: <br /> <span className="ml-2 text-secondary-500">{role}</span>
				</h3>
			</div>
		</div>
	);
}
