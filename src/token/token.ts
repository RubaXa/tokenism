type TokenComment = string;
type TokenValue = string | number | boolean | object;
type TokenValueFactory = ((...args: any) => TokenValue) | TokenValue;

type TokenType<T extends TokenValueFactory> = T extends () => infer R ? R : T;
type TokenValueNorm<T extends TokenValueFactory> = T extends (...args: infer A) => infer R
	? R | ((...args: A) => R)
	: T
;

type TokenTuple = readonly [
	TokenComment,
	TokenValueFactory,
]

type TokenCompositeTuple = readonly [
	TokenComment,
	TokenTupleMap,
]

type TokenTupleMap = {
	[name:string]: TokenTuple | TokenCompositeTuple;
}

type TokenDict<T extends TokenTupleMap> = {
	[K in keyof T]: (T[K] extends TokenCompositeTuple
		? Token<T[K][0], TokenCompositeArgs<T[K][1]>> & {part: TokenDict<T[K][1]>}
		: Token<T[K][0], T[K][1]>
	);
}

type TokenCompositeArgs<T extends TokenTupleMap> = {
	[K in keyof T]?: (
		T[K][1] extends TokenTupleMap
			? TokenCompositeArgs<T[K][1]>
			: TokenValueNorm<T[K][1]>
	)
}

type TokenValueResult<T> = (
	T extends () => infer R ? R :
	T extends TokenTuple ? TokenType<T[1]> :
	T extends {[key:string]: TokenValueFactory} ? {
		[K in keyof T]: TokenValueResult<T[K]>;
	} :
	never
)

export function createDict<
	TM extends TokenTupleMap,
>(tuples: TM): TokenDict<TM> {
	return Object.entries(tuples).reduce((dict, [key, tuple]) => {
		if (isTokenTupleMap(tuple[1])) {
			const nested = createDict(tuple[1]);
			const token = createToken(key, [tuple[0], createTokenCompositeValue(tuple[1])]);

			Object.defineProperty(token, 'part', {
				enumerable: false,
				value: nested,
			});

			dict[key] = token;
		} else {
			dict[key] = createToken(key, tuple);
		}
		return dict;
	}, {}) as TokenDict<TM>;
}

type TokenFactory <
	DC extends TokenComment,
	V extends TokenValueFactory,
> = <C extends TokenComment | null>(comment?: string, value?: TokenValueNorm<V>) => Token<
	C extends null ? DC : C,
	V
>;

type Token<
	C extends TokenComment,
	V extends TokenValueFactory,
> = TokenFactory<C, V> & {
	as: (key: string, comment?: string, value?: V) => Token<C, V>;
	tuple: () => readonly [C, V];
	key: () => string;
	param: () => string;
	comment: () => C;
	value: () => TokenValueResult<V>;
	lastValue: () => TokenValueResult<V> | undefined;
	optional: (comment?: string, value?: V) => Token<C, V>;
	isOptional: () => boolean;
	toAPIDOCJSON: () => object;
}

export function createToken<
	K extends string,
	T extends TokenTuple,
>(
	key: K,
	tuple: T,
	extra: {
		comment?: TokenComment;
		value?: TokenValueFactory;
		optional?: boolean;
	} = {},
) {
	function token(comment: TokenComment, value?: T[1]) {
		if (arguments.length > 0) {
			return createToken(key, tuple, {
				...extra,
				comment,
				value,
			});
		}

		return token;
	}

	let lastValue = undefined;
	let optional = !!extra.optional;

	const paramName = snakeCase(key);
	const comment = () => extra.comment != null ? extra.comment : tuple[0];

	const value = (comments?: boolean) => {
		if (extra.value != null) {
			lastValue = evalValue(extra.value, tuple[1], comments);
		} else {
			lastValue = evalValue(null, tuple[1], comments);
		}
		return lastValue;
	};

	Object.defineProperties(token, {
		as: {
			enumerable: false,
			value: (key: string, comment: TokenComment, value?: T[1]) => {
				return createToken(key, tuple, {comment, value});
			},
		},

		tuple: {
			enumerable: false,
			value: () => tuple,
		},

		key: {
			enumerable: false,
			value: () => key,
		},

		param: {
			enumerable: false,
			value: () => paramName,
		},

		comment: {
			enumerable: false,
			value: comment,
		},

		value: {
			enumerable: false,
			value: ()=> value(),
		},

		lastValue: {
			enumerable: false,
			value: () => lastValue,
		},

		optional: {
			enumerable: false,
			value: (comment: TokenComment, value?: T[1]) => {
				return createToken(key, tuple, {comment, value, optional: true});
			},
		},

		isOptional: {
			enumerable: false,
			value: () => optional,
		},

		toAPIDOCJSON: {
			enumerable: false,
			value: () => {
				let val = value(true);

				return {
					[`${paramName}${optional ? '?' : ''}__comment`]: `${comment()}. ${typeOf(val)}`,
					[`${paramName}${optional ? '?' : ''}`]: val,
				};
			},
		},
	});

	return token as Token<T[0], T[1]>;
}

function typeOf(val: unknown) {
	let type = val === null ? 'null' : typeof val;
	return `${type.charAt(0).toUpperCase()}${type.slice(1)}.`;
}

function evalValue(value: TokenValueFactory, factory?: TokenValueFactory, comments?: boolean): TokenValue {
	let val = typeof value === 'function' ? evalValue(value()) : value;

	if (comments && typeof factory === 'function' && factory['withComments']) {
		factory = factory['withComments'];
	}

	if (typeof factory === 'function') {
		if (!/^\(\)/.test(factory.toString())) {
			val = evalValue(val == null ? factory() : factory(val));
		} else if (val == null) {
			val = evalValue(factory());
		}
	} else if (val == null) {
		val = factory;
	}

	return val;
}

function isTokenTupleMap(value: TokenValueFactory | TokenTupleMap): value is TokenTupleMap {
	return (
		value !== null &&
		typeof value === 'object' &&
		Object.values(value).every(v => Array.isArray(v))
	);
}

function createTokenCompositeValue(map: TokenTupleMap): any {
	function compose(map: TokenTupleMap, values?: any, comments?: boolean) {
		return Object.entries(map).reduce((result, [key, tuple]) => {
			const factory = tuple[1];
			const val = values ? values[key] : null;
			const name = snakeCase(key);

			if (comments) {
				result[`${name}__comment`] = `${tuple[0]}. `;
			}

			if (isTokenTupleMap(factory)) {
				result[name] = compose(factory, val, comments);
			} else {
				result[name] = val != null ? evalValue(val, factory) : evalValue(factory);
			}

			if (comments) {
				result[`${name}__comment`] += typeOf(result[name]);
			}

			return result;
		}, {});
	}

	const factory = (values?: any) => compose(map, values);
	factory.withComments = (values?: any) => compose(map, values, true);

	return factory;
}

export function composeTokens<T extends any[]>(...tokens: T): TokenValueFactory {
	const map = tokens.reduce((map, token: Token<any, any>) => {
		if (token) {
			map[token.key()] = [token.comment(), token.value];
		}

		return map;
	}, {});

	return createTokenCompositeValue(map);
}

function snakeCase(key: string) {
	return key.replace(/[A-Z]/g, (chr) => `_${chr.toLowerCase()}`);
}