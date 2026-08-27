interface SelectProps<T extends string | number> {
	name: string;
	slug: string;
	options: T[];
	updateParams: (updates: Record<string, string | number | null>) => void;
	searchParams: URLSearchParams
	default?: T;
	values?: T[];
}

export function Select<T extends string | number>({
	name,
	slug,
	options,
	updateParams,
	searchParams,
	default: defaultValue,
	values,
}: SelectProps<T>) {
	const activeValues = values ?? options;
	const currentValue = searchParams.get(slug) ?? defaultValue ?? "";
	if (activeValues?.length !== options.length)
		console.warn(
			`Provided Values and Options for: ${name} filter aren't aren't the same number`,
		);

	return (
		<select
			className="[appearance:base-select] [&::picker(select)]:[appearance:base-select]
                    [&::picker(select)]:rounded-xl dark:hover:bg-accent-800 hover:bg-accent-200 transition-colors
                    [&::picker-icon]:transition-transform [&:open::picker-icon]:rotate-180
                    dark:bg-accent-900 bg-accent-300 p-1.5 rounded-2xl font-medium px-2.5"
			onChange={(e) => {
				updateParams({ [slug]: e.target.value as T });
			}}
			value={currentValue}
		>
			<option
				value=""
				className="[&::checkmark]:hidden dark:checked:bg-accent-700 checked:bg-accent-300 
					dark:hover:bg-accent-800 hover:bg-accent-200 px-2.5"
			>
				{name}
			</option>
			{options.map((option, index) => (
				<option
					value={activeValues[index]}
					key={option}
					className="[&::checkmark]:hidden dark:checked:bg-accent-700 checked:bg-accent-300 
					dark:hover:bg-accent-800 hover:bg-accent-200 px-2.5"
				>
					{option}
				</option>
			))}
		</select>
	);
}
