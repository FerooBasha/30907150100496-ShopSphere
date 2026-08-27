import CategoryCard from "../components/CategoryCard";
import Hero from "../components/Hero";

function Home() {
	return (
		<>
			<Hero />
			<div className="pt-5 px-10">
				<h2>Top Categories</h2>
				<div className="grid grid-cols-6 not-md:grid-cols-3 not-md:gap-5 gap-10 mt-3">
					<CategoryCard title="CPUs" slug="cpu" variant="amber">
						<img
							src="AMD-Ryzen-5-3600_-1.png"
							alt="CPU Picture"
							className="scale-100 row-start-2"
						/>
					</CategoryCard>

					<CategoryCard title="GPUs" slug="gpu" variant="cosmic">
						<img
							src="pngtree-gpu-power-phases-png-image_15512252.png"
							alt="GPU Picture"
							className="scale-150 row-start-2"
						/>
					</CategoryCard>
					<CategoryCard title="Monitors" slug="monitor" variant="grape">
						<img
							src="monitors-removebg-preview.png"
							alt="Motherboard Picture"
							className="scale-200 row-start-2"
						/>
					</CategoryCard>

					<CategoryCard title="RAM" slug="ram" variant="rainbow">
						<img
							src="RAM-PC-Component-Computer-Memory-PNG-768x572-removebg-preview.png"
							alt="RAM Picture"
							className="scale-150 rotate-15 row-start-2"
						/>
					</CategoryCard>
					<CategoryCard title="Peripherals" slug="peripherals" variant="amber">
						<img
							src="mouse-and-keyboard-removebg-preview.png"
							alt="Case Picture"
							className="scale-140 rotate-10 row-start-2"
						/>
					</CategoryCard>
					<CategoryCard title="Storage" slug="storage" variant="fuchsia">
						<img
							src="2t_05dccd58c7.webp"
							alt="GPU Picture"
							className="scale-170 rotate-2 -mr-5 -mt-4 row-start-2"
						/>
					</CategoryCard>
				</div>
			</div>
			<div className="h-20"></div>
		</>
	);
}

export default Home;
