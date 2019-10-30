export const gen = () => `AG_${Math.random().toString(16).split('.')[1]}`;

export default <const>[
	'Autogen-токен',
	gen,
];