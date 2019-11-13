type TokenValuePrimitive = string | boolean | number;
type TokenValue = string | boolean | number | TokenValuePrimitive[];
type TokenValueGen = (...args: any[]) => TokenValue;

type LikeToken = (comment?: string, value?: any) => LikeToken;
type TokeValueCompositeFactory = (() => LikeToken[]) & {composite: boolean};

type TokenValueFactory =
	| TokenValue
	| TokenValueGen
;

type TokenValueInfer<T extends TokenValueFactory> = T extends () => infer R ? R : T;
type TokenValueTypedFactory<
	V extends TokenValueFactory,
	T = TokenValueInfer<V>,
> = T | ((...args: any[]) => T);

type TokenJSON<
	K extends string,
	C extends string,
	V extends TokenValueFactory,
> = {
	key: K;
	param: string;
	optional: boolean;
	comment: C;
	value: TokenValueInfer<V>;
	type: string;
}

type TokenFactory<
	K extends string,
	C extends string,
	V extends TokenValueFactory,
> = <
	NC extends string = C,
	NV extends TokenValueFactory = V,
>(comment?: NC, value?: NV) => Token<K, NC, NV>;

type Token<
	K extends string,
	C extends string,
	V extends TokenValueFactory,
> = TokenFactory<K, C, V> & {
	as: <
		P extends string,
		NC extends string = C,
		NV extends TokenValueFactory = V,
	>(param: P, comment?: string, value?: TokenValueTypedFactory<V>) => Token<P, NC, NV>;

	optional: <
		NC extends string = C,
		NV extends TokenValueFactory = V,
	>(comment?: string, value?: TokenValueTypedFactory<V>) => Token<K, NC, NV>;

	key: () => K;
	comment: () => C;
	value: () => TokenValueInfer<V>;
	lastValue: () => TokenValueInfer<V>;
	param: () => string;
	toJSON: () => TokenJSON<K, C, V>;
};

type TokenExtra<
	C extends string,
	V extends TokenValueFactory,
> = {
	composite?: boolean;
	optional?: boolean;
	param?: string;
	comment?: C;
	value?: V;
}

type CastToTokenValueFactory<
	F extends TokenValueFactory | TokeValueCompositeFactory,
> = (
	F extends TokeValueCompositeFactory
		? () => 'composite'
		: F
);

export function composeTokens<T extends LikeToken[]>(...tokens: T): TokeValueCompositeFactory {
	return defineProperties(() => tokens, {
		composite: true,
	});
}

export function createToken<
	K extends string,
	C extends string,
	F extends TokenValueFactory | TokeValueCompositeFactory,
	V extends TokenValueFactory = CastToTokenValueFactory<F>,
>(
	key: K,
	comment: C,
	value: F,
): Token<K, C, V> {
	const extra = Object(this) as TokenExtra<C, V>;
	const getExtra = (other: TokenExtra<C, V> = {}) => ({
		comment,
		value,
		...extra,
		...other,
	});

	function token(nextComment?: string, nextValue?: V) {
		return createToken.call(getExtra(), key, nextComment, nextValue);
	}

	let lastValue: TokenValueInfer<V>;

	const optional = !!extra.optional;
	const getKey = () => key;
	const getParam = () => snakeCase(extra.param || key);
	const getComment = () => comment || extra.comment;
	const getValue = (mode: 'value' | 'raw') => {
		lastValue = compute(value as any, extra.value, mode);
		return lastValue;
	};

	return defineProperties(token, {
		as: (param: string, nextComment?: string, nextValue?: TokenValueFactory) => {
			return createToken.call(getExtra({param}), key, nextComment, nextValue);
		},
		optional: (nextComment?: string, nextValue?: TokenValueFactory) => {
			return createToken.call(getExtra({optional: true}), key, nextComment, nextValue);
		},
		key: getKey,
		param: getParam,
		comment: getComment,
		value: () => getValue('value'),
		lastValue: () => lastValue,
		toJSON: () => {
			let val = getValue('raw');

			return {
				name: getParam(),
				value: val,
				optional,
				comment: getComment(),
				type: typeOf(val),
			};
		},
	}) as any; // todo!!!
}

function defineProperties<T extends object, P extends object>(obj: T, props: P): T & P {
	const map = Object.keys(props).reduce((descr, key) => {
		descr[key] = {
			writable: false,
			configurable: false,
			value: props[key],
		};

		return descr;
	}, {} as PropertyDescriptorMap)

	Object.defineProperties(obj, map);

	return obj as T & P;
}

function snakeCase(key: string) {
	return key.replace(/[A-Z]/g, (chr) => `_${chr.toLowerCase()}`);
}

function isTokenValueGen(val: unknown): val is TokenValueGen {
	return typeof val === 'function';
}

function compute<
	V extends TokenValueFactory | TokeValueCompositeFactory,
	I extends TokenValueFactory | TokeValueCompositeFactory,
	R extends TokenValueInfer<any>, // todo: -any
>(
	value: V,
	initial?: I,
	mode?: 'value' | 'raw',
): R {
	if (isTokeValueCompositeFactory(value)) {
		return computeComposite(value, mode) as any; // todo: -any
	}

	if (isTokeValueCompositeFactory(initial)) {
		return;
	}

	const valueFactory = value as TokenValueFactory;
	const initialFactory = initial as TokenValueFactory;

	let val = (isTokenValueGen(valueFactory) ? compute(valueFactory()) : valueFactory) as R;

	if (isTokenValueGen(initialFactory)) {
		if (!/^\(\)/.test(initial.toString())) {
			val = compute(val == null ? initialFactory() : initialFactory(val));
		} else if (val == null) {
			val = compute(initialFactory());
		}
	} else if (val == null) {
		val = initialFactory as any; // todo: -any
	}

	return val;
}

function computeComposite(factory: TokeValueCompositeFactory, mode?: 'value' | 'raw') {
	const tokens = factory();
	const result = {};

	for (let token of tokens) {
		if (isToken(token)) {
			result[token.param()] = mode === 'raw' ? token.toJSON() : token.value();
		}
	}

	return result
	// return tokens.reduce((map, token) => {
	// 	map[32] = 123;
	// 	return map;
	// }, {}) as any;
}

function typeOf(val: unknown) {
	let type = val === null ? 'null' : typeof val;
	return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

function isLikeToken(val: unknown): val is LikeToken {
	return typeof val === 'function' && typeof val['as'] === 'function';
}

function isToken(val: unknown): val is Token<any, any, any> {
	return isLikeToken(val);
}

function isTokeValueCompositeFactory(val: unknown): val is TokeValueCompositeFactory {
	if (typeof val === 'function') {
		return !!val['composite'];
	}

	return false;
}
