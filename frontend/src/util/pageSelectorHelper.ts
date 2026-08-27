const pageSelectorSize = 3; // range extends this far in each direction (total width = pageSelectorSize * 2 + 1)

function getPageSelectorList(totalPages: number, currentPage: number) {
	// Clamp currentPage into valid range just in case
	currentPage = Math.min(Math.max(currentPage, 1), totalPages);

	let start = currentPage - pageSelectorSize;
	let end = currentPage + pageSelectorSize;

	// If start goes below 1, push the extra range onto the end
	if (start < 1) {
		end += 1 - start; // add the deficit to end
		start = 1;
	}

	// If end goes above totalPages, push the extra range onto the start
	if (end > totalPages) {
		start -= end - totalPages; // subtract the excess from start
		end = totalPages;
	}

	// Re-clamp in case totalPages is smaller than the selector width
	start = Math.max(start, 1);
	end = Math.min(end, totalPages);

	const pages = [];
	for (let i = start; i <= end; i++) {
		pages.push(i);
	}

	return pages;
}

export default getPageSelectorList
