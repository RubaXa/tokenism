import { createToken } from '../token';

export const gen = () => `AG_${Math.random().toString(16).split('.')[1]}`;

export default createToken(
	'agToken',
	'Autogen-токен',
	gen,
);
