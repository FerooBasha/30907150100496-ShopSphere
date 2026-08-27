import { useState } from "react";
import { FaStarHalfAlt, FaStar, FaRegStar } from "react-icons/fa";

interface StarRatingInputProps {
	value: number; // 1-10
	onChange: (rating: number) => void;
	className?: string;
}

export default function StarRatingInput({
	value,
	onChange,
	className = "",
}: StarRatingInputProps) {
	const totalStars = 5;
	const [hoverRating, setHoverRating] = useState<number | null>(null);

	const displayRating = hoverRating ?? value;

	// Given a star index (0-based) and click/hover position within it,
	// determine whether it's the left (half) or right (full) side.
	function getRatingFromEvent(
		e: React.MouseEvent<HTMLDivElement>,
		starIndex: number,
	): number {
		const { left, width } = e.currentTarget.getBoundingClientRect();
		const clickX = e.clientX - left;
		const isHalf = clickX < width / 2;
		const wholeStarValue = (starIndex + 1) * 2; // e.g. star 0 -> 2, star 1 -> 4
		return isHalf ? wholeStarValue - 1 : wholeStarValue;
	}

	function handleClick(e: React.MouseEvent<HTMLDivElement>, starIndex: number) {
		const rating = getRatingFromEvent(e, starIndex);
		onChange(Math.max(1, Math.min(10, rating)));
	}

	function handleMouseMove(e: React.MouseEvent<HTMLDivElement>, starIndex: number) {
		setHoverRating(getRatingFromEvent(e, starIndex));
	}

	const fullStars = Math.floor(displayRating / 2);
	const halfStar = displayRating % 2 === 1;

	const stars = [];
	for (let i = 0; i < totalStars; i++) {
		let icon = <FaRegStar />;
		if (i < fullStars) {
			icon = <FaStar />;
		} else if (i === fullStars && halfStar) {
			icon = <FaStarHalfAlt />;
		}

		stars.push(
			<div
				key={i}
				className="relative cursor-pointer text-amber-500 text-2xl px-0.5"
				onMouseMove={(e) => handleMouseMove(e, i)}
				onMouseLeave={() => setHoverRating(null)}
				onClick={(e) => handleClick(e, i)}
			>
				{icon}
			</div>,
		);
	}

	return (
		<div className={`flex items-center ${className}`}>
			{stars}
			<span className="ml-2 text-sm text-gray-500">
				{displayRating ? displayRating / 2 : ""}
			</span>
		</div>
	);
}