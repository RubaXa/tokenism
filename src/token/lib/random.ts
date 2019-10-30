export const rand = (min: number = 0, max: number = 1e13) => min + Math.round(Math.random() * (max - min));
export const gen = () => rand();

export default <const>[
	'Радном',
	gen,
];