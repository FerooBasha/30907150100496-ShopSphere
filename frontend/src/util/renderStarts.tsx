import { FaStarHalfAlt, FaStar, FaRegStar } from "react-icons/fa";

// Function stolen from myself and made typescript: https://github.com/Fareskingtube/runny-bunny/blob/main/src/utils/renderStars.jsx 

export default function renderStars(rating: number) {
	const stars = [];
	const totalStars = 5;

	// Clamp rating to valid range [0, 10] and ensure it's an integer
	const clampedRating = Math.max(0, Math.min(10, Math.round(rating)));

	const fullStars = Math.floor(clampedRating / 2);
	const halfStar = clampedRating % 2 === 1;

	for (let i = 0; i < fullStars; i++) {
		stars.push(<FaStar key={`full-${i}`} className="text-amber-500" />);
	}

	if (halfStar) {
		stars.push(<FaStarHalfAlt key="half" className="text-amber-500" />);
	}

	while (stars.length < totalStars) {
		stars.push(
			<FaRegStar key={`empty-${stars.length}`} className="text-amber-500" />,
		);
	}

	return stars;
}