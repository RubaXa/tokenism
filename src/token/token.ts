import {
	LikeToken,
	TokenValueCompositeFactory,
	TokenValueFactory,
	CastToTokenValueFactory,
	Token,
	TokenExtra,
	TokenValueGen,
	TokenValueInfer,
	CompositeToken,
	CompositeTokenParams,
} from './token.types';

export function composeTokens<
	F extends LikeToken[],
	P extends object,
>(
	factory: (
		compose: <T extends LikeToken[]>(...t: T) => T,
		params: P,
	) => F,
): TokenValueCompositeFactory<F>;
export function composeTokens<T extends LikeToken[]>(...tokens: T): TokenValueCompositeFactory<T>;
export function composeTokens(...args: any): Function {
	if (typeof args[0] === 'function') {
		const factory = args[0];
		const compose = (...tokens: any) => tokens;
		return defineProperties((params: object = {}) => factory(compose, params), {
			composite: 2,
		});
	} else {
		return defineProperties(() => args, {
			composite: 1,
		});
	}
}

export function createToken<
	K extends string,
	C extends string,
	V extends TokenValueCompositeFactory<any>,
>(
	key: K,
	comment: C,
	value: V,
): CompositeToken<K, C, V>;
export function createToken<
	K extends string,
	C extends string,
	V extends TokenValueFactory,
>(
	key: K,
	comment: C,
	value: V,
): Token<K, C, V>;
export function createToken(key: string, comment: string, value: any): Function {
	const extra = Object(this) as TokenExtra<string, any>;
	const getExtra = (other: TokenExtra<string, any> = {}) => ({
		comment,
		value,
		...extra,
		...other,
	});

	function token(nextComment?: string, nextValue?: any) {
		return createToken.call(getExtra(), key, nextComment, nextValue);
	}

	let lastValue: TokenValueInfer<any>;

	const optional = !!extra.optional;
	const getKey = () => key;
	const getParam = () => snakeCase(extra.param || key);
	const getComment = () => comment || extra.comment;
	const getValue = (mode?: 'raw') => {
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
		value: () => getValue(),
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
	V extends TokenValueFactory | TokenValueCompositeFactory<any>,
	I extends TokenValueFactory | TokenValueCompositeFactory<any>,
	R extends TokenValueInfer<any>, // todo: -any
>(
	value: V,
	initial?: I,
	mode?: 'raw',
): R {
	if (isTokenValueCompositeFactory(value)) {
		return computeComposite(value, null, mode) as any; // todo: -any
	}

	if (isTokenValueCompositeFactory(initial)) {
		return computeComposite(initial, value, mode) as any; // todo: -any
	}

	const valueFactory = value as TokenValueFactory;
	const initialFactory = initial as TokenValueFactory;

	let val = (isTokenValueGen(valueFactory) ? compute(valueFactory()) : valueFactory) as R;

	if (isTokenValueGen(initialFactory)) {
		if (!/^\(\)/.test(initialFactory.toString())) {
			val = compute(val == null ? initialFactory() : initialFactory(val));
		} else if (val == null) {
			val = compute(initialFactory());
		}
	} else if (val == null) {
		val = initialFactory as any; // todo: -any
	}

	if (Array.isArray(val)) {
		return val.map((v: any) => {
			if (isToken(v)) {
				return mode === 'raw' ? v.toJSON() : v.value();
			}
			return v;
		})
	}

	return val;
}

function computeComposite(
	factory: TokenValueCompositeFactory<any>,
	params?: any,
	mode?: 'raw',
): object {
	const tokens = factory();
	const result = {};

	for (let token of tokens) {
		if (isToken(token)) {
			const key = token.key();
			const val = params && params[key] || null;
			const t = val ? token(null, val) : token;
			result[key] = mode === 'raw' ? t.toJSON() : t.value();
		}
	}

	return result;
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

function isTokenValueCompositeFactory(val: unknown): val is TokenValueCompositeFactory<any> {
	if (typeof val === 'function') {
		return !!val['composite'];
	}

	return false;
}
